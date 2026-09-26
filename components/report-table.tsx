import {
  reportTable,
  statementNote,
  type ReportMode,
  type ReportRow,
} from "@/lib/reports";
export default function ReportTable({
  rows,
  mode,
}: {
  rows: ReportRow[];
  mode: ReportMode;
}) {
  const table = reportTable(rows, mode);
  return (
    <section className="grouped-report">
      <div className="report-title">
        <h3>{table.title}</h3>
        {table.statement && <p>{statementNote}</p>}
      </div>
      <div className="table-scroll">
        <table className={table.statement ? "statement-table" : undefined}>
          <thead>
            {table.statement && (
              <tr className="statement-sides">
                <th colSpan={2}>Income</th>
                <th colSpan={2}>Expense</th>
              </tr>
            )}
            <tr>
              {table.columns.map((c, i) => (
                <th
                  key={i}
                  className={
                    (
                      table.statement
                        ? i % 2 === 1
                        : i >= table.columns.length - 2
                    )
                      ? "align-right"
                      : ""
                  }
                >
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {table.lines.map((line, index) =>
              line.kind === "group" || line.kind === "balance" ? (
                <tr
                  className={
                    line.kind === "group" ? "report-group" : "report-balance"
                  }
                  key={index}
                >
                  <th colSpan={table.columns.length}>{line.cells[0]}</th>
                </tr>
              ) : (
                <tr
                  key={index}
                  className={line.kind === "total" ? "report-total" : ""}
                >
                  {line.cells.map((cell, i) => (
                    <td
                      key={i}
                      className={
                        (
                          table.statement
                            ? i % 2 === 1
                            : i >= table.columns.length - 2
                        )
                          ? "align-right"
                          : "report-cell"
                      }
                    >
                      {cell}
                    </td>
                  ))}
                </tr>
              ),
            )}
          </tbody>
        </table>
        {!rows.length && (
          <div className="empty">
            No transactions match the selected filters.
          </div>
        )}
      </div>
    </section>
  );
}
