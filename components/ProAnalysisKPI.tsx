"use client";
import { useProAnalysis } from "@/hooks/useProAnalysis";

export default function ProAnalysisKPI() {
  const { data, isLoading, error, refresh } = useProAnalysis();

  if (isLoading) return <div>Loading analysis…</div>;
  if (error) return <div>Failed to load analysis.</div>;
  if (!data.length) return <div>No analysis docs found.</div>;

  // Show the latest document (or map all if you want a table)
  const doc = data[0];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Risk & Performance (latest)</h2>
        <button
          onClick={() => refresh()}
          className="rounded-md border px-3 py-1 text-sm"
        >
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        <KPI label="Total Trades" value={doc.total_trades} />
        <KPI label="Win Trades" value={doc.win_trades} />
        <KPI label="Win %" value={`${doc.win_percent}%`} />
        <KPI label="Total Volume" value={doc.total_volume} />
        <KPI label="Avg Risk Score" value={doc.avg_risk_score} />
        <KPI label="Avg Risk Status" value={doc.avg_risk_status} />
        <KPI label="Generated At" value={new Date(doc.generated_at).toLocaleString()} />
        {doc.window && (
          <KPI
            label="Window"
            value={`${new Date(doc.window.start).toLocaleString()} → ${new Date(
              doc.window.end
            ).toLocaleString()} (${doc.window.tz})`}
          />
        )}
      </div>

      {/* Example: show a top-10 list if present */}
      {doc.analysis?.top_10_profitable_trades?.length ? (
        <div>
          <h3 className="font-medium mt-4 mb-2">Top 10 Profitable Trades</h3>
          <pre className="text-xs overflow-auto bg-black/5 p-3 rounded-md">
            {JSON.stringify(doc.analysis.top_10_profitable_trades, null, 2)}
          </pre>
        </div>
      ) : null}
    </div>
  );
}

function KPI({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-lg border p-3">
      <div className="text-xs text-gray-500">{label}</div>
      <div className="text-lg font-semibold">{value ?? "—"}</div>
    </div>
  );
}
