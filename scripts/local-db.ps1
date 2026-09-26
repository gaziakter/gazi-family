param([ValidateSet('start','stop')][string]$Action='start')
$ErrorActionPreference='Stop'
$projectRoot=Split-Path -Parent $PSScriptRoot
$pgBin='C:\Program Files\PostgreSQL\18\bin'
$dataDirectory=Join-Path $projectRoot '.local\postgres'
$pgCtl=Join-Path $pgBin 'pg_ctl.exe'
if (-not (Test-Path -LiteralPath $pgCtl)) { throw 'PostgreSQL 18 is not installed in the default location. Use Docker Compose or your own DATABASE_URL.' }
if ($Action -eq 'stop') { & $pgCtl -D $dataDirectory stop; exit $LASTEXITCODE }
if (-not (Test-Path -LiteralPath (Join-Path $dataDirectory 'PG_VERSION'))) {
  if (Test-Path -LiteralPath (Join-Path $projectRoot '.env')) { throw 'An .env already exists. Keep that database configuration, or move the file yourself before initializing a local database.' }
  New-Item -ItemType Directory -Force -Path (Join-Path $projectRoot '.local') | Out-Null
  $secretBytes=New-Object byte[] 24
  $rng=[System.Security.Cryptography.RandomNumberGenerator]::Create()
  $rng.GetBytes($secretBytes)
  $rng.Dispose()
  $databasePassword=([BitConverter]::ToString($secretBytes)).Replace('-','').ToLower()
  $passwordFile=Join-Path $projectRoot '.local\init-password'
  [IO.File]::WriteAllText($passwordFile,$databasePassword)
  & (Join-Path $pgBin 'initdb.exe') -D $dataDirectory -U gazi --auth=scram-sha-256 --pwfile=$passwordFile --encoding=UTF8 --locale=C
  if ($LASTEXITCODE -ne 0) { throw 'Database initialization failed.' }
  Remove-Item -LiteralPath $passwordFile
  [IO.File]::WriteAllText((Join-Path $projectRoot '.env'),('DATABASE_URL="postgresql://gazi:'+ $databasePassword +'@localhost:55432/gazi_family?schema=public"'+[Environment]::NewLine))
}
& $pgCtl -D $dataDirectory status
if ($LASTEXITCODE -ne 0) {
  & $pgCtl -D $dataDirectory -l (Join-Path $projectRoot '.local\postgres.log') -o '-p 55432 -h 127.0.0.1' -w start
  if ($LASTEXITCODE -ne 0) { throw 'Database could not start.' }
}
$envContents=[IO.File]::ReadAllText((Join-Path $projectRoot '.env'))
$databaseUrl=[regex]::Match($envContents,'DATABASE_URL="([^"]+)"').Groups[1].Value
$env:PGPASSWORD=([uri]$databaseUrl).UserInfo.Split(':')[1]
try {
  $exists=& (Join-Path $pgBin 'psql.exe') -h 127.0.0.1 -p 55432 -U gazi -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname='gazi_family'"
  if ($exists -ne '1') { & (Join-Path $pgBin 'createdb.exe') -h 127.0.0.1 -p 55432 -U gazi gazi_family; if ($LASTEXITCODE -ne 0) { throw 'Database creation failed.' } }
} finally { Remove-Item Env:PGPASSWORD }
Write-Output 'Gazi Family PostgreSQL is ready on localhost:55432. Run npm.cmd run db:deploy.'
