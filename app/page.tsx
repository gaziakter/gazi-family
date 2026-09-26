import Dashboard from "@/components/dashboard";
export const dynamic = "force-dynamic";
export default function Page() {
  return <Dashboard demo={!process.env.DATABASE_URL} />;
}
