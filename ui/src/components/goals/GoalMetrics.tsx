import { useState, useEffect } from "react";
import type { Goal } from "../../pages/GoalsPage";

type Props = {
  goals: Goal[];
};

type Metrics = {
  total: number;
  active: number;
  completed: number;
  failed: number;
  killed: number;
  avg_score: number;
  on_track: number;
  at_risk: number;
  behind: number;
  critical: number;
  overdue: number;
};

export function GoalMetrics({ goals }: Props) {
  const [metrics, setMetrics] = useState<Metrics | null>(null);

  useEffect(() => {
    fetch("/api/goals/metrics")
      .then(r => r.json())
      .then(setMetrics)
      .catch(() => {});
  }, [goals.length]);

  if (!metrics) {
    return <div style={{ padding: "24px", color: "var(--j-text-dim)" }}>Loading metrics...</div>;
  }

  // Score distribution
  const scoreBuckets = [
    { label: "0.0-0.2", count: goals.filter(g => g.status === "active" && g.score < 0.2).length, color: "var(--j-error)" },
    { label: "0.2-0.4", count: goals.filter(g => g.status === "active" && g.score >= 0.2 && g.score < 0.4).length, color: "#f97316" },
    { label: "0.4-0.6", count: goals.filter(g => g.status === "active" && g.score >= 0.4 && g.score < 0.6).length, color: "var(--j-warning)" },
    { label: "0.6-0.8", count: goals.filter(g => g.status === "active" && g.score >= 0.6 && g.score < 0.8).length, color: "var(--j-success)" },
    { label: "0.8-1.0", count: goals.filter(g => g.status === "active" && g.score >= 0.8).length, color: "var(--j-accent)" },
  ];
  const maxBucket = Math.max(1, ...scoreBuckets.map(b => b.count));

  // Level breakdown
  const levels = ["objective", "key_result", "milestone", "task", "daily_action"];
  const levelCounts = levels.map(l => ({
    level: l.replace("_", " "),
    total: goals.filter(g => g.level === l).length,
    active: goals.filter(g => g.level === l && g.status === "active").length,
    completed: goals.filter(g => g.level === l && g.status === "completed").length,
  }));

  return (
    <div style={{ padding: "24px", overflow: "auto", height: "100%" }}>
      {/* Top metrics */}
      <div style={{ display: "flex", gap: "16px", marginBottom: "24px", flexWrap: "wrap" }}>
        <MetricCard label="Total Goals" value={metrics.total} />
        <MetricCard label="Active" value={metrics.active} color="var(--j-accent)" />
        <MetricCard label="Completed" value={metrics.completed} color="var(--j-success)" />
        <MetricCard label="Failed / Killed" value={metrics.failed + metrics.killed} color="var(--j-error)" />
        <MetricCard label="Avg OKR Score" value={metrics.avg_score.toFixed(2)} color={metrics.avg_score >= 0.7 ? "var(--j-success)" : metrics.avg_score >= 0.4 ? "var(--j-warning)" : "var(--j-error)"} />
        <MetricCard label="Overdue" value={metrics.overdue} color={metrics.overdue > 0 ? "var(--j-error)" : "var(--j-text-muted)"} />
      </div>

      <div style={{ display: "flex", gap: "24px", flexWrap: "wrap" }}>
        {/* Health Distribution */}
        <div style={{
          flex: "1 1 280px",
          background: "var(--j-surface)",
          border: "1px solid var(--j-border)",
          borderRadius: "8px",
          padding: "16px",
        }}>
          <h3 style={{ fontSize: "14px", fontWeight: 600, color: "var(--j-text)", margin: "0 0 12px 0" }}>Health Distribution</h3>
          <HealthBar label="On Track" count={metrics.on_track} total={metrics.active} color="var(--j-success)" />
          <HealthBar label="At Risk" count={metrics.at_risk} total={metrics.active} color="var(--j-warning)" />
          <HealthBar label="Behind" count={metrics.behind} total={metrics.active} color="#f97316" />
          <HealthBar label="Critical" count={metrics.critical} total={metrics.active} color="var(--j-error)" />
        </div>

        {/* Score Distribution */}
        <div style={{
          flex: "1 1 280px",
          background: "var(--j-surface)",
          border: "1px solid var(--j-border)",
          borderRadius: "8px",
          padding: "16px",
        }}>
          <h3 style={{ fontSize: "14px", fontWeight: 600, color: "var(--j-text)", margin: "0 0 12px 0" }}>Score Distribution (Active)</h3>
          <div style={{ display: "flex", alignItems: "flex-end", gap: "8px", height: "80px" }}>
            {scoreBuckets.map((bucket) => (
              <div key={bucket.label} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center" }}>
                <div style={{
                  width: "100%",
                  height: `${(bucket.count / maxBucket) * 60}px`,
                  background: bucket.color,
                  borderRadius: "3px 3px 0 0",
                  opacity: 0.7,
                  minHeight: bucket.count > 0 ? "4px" : "0",
                }} />
                <span style={{ fontSize: "10px", color: "var(--j-text-muted)", marginTop: "4px" }}>
                  {bucket.label}
                </span>
                <span style={{ fontSize: "11px", color: "var(--j-text-dim)", fontWeight: 600 }}>
                  {bucket.count}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Level Breakdown */}
        <div style={{
          flex: "1 1 280px",
          background: "var(--j-surface)",
          border: "1px solid var(--j-border)",
          borderRadius: "8px",
          padding: "16px",
        }}>
          <h3 style={{ fontSize: "14px", fontWeight: 600, color: "var(--j-text)", margin: "0 0 12px 0" }}>By Level</h3>
          {levelCounts.map((lc) => (
            <div key={lc.level} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "4px 0", fontSize: "12px" }}>
              <span style={{ color: "var(--j-text)", textTransform: "capitalize" }}>{lc.level}</span>
              <div style={{ display: "flex", gap: "12px", color: "var(--j-text-muted)" }}>
                <span>{lc.total} total</span>
                <span style={{ color: "var(--j-accent)" }}>{lc.active} active</span>
                <span style={{ color: "var(--j-success)" }}>{lc.completed} done</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function MetricCard({ label, value, color }: { label: string; value: string | number; color?: string }) {
  return (
    <div style={{
      flex: "1 1 120px",
      background: "var(--j-surface)",
      border: "1px solid var(--j-border)",
      borderRadius: "8px",
      padding: "12px 16px",
      textAlign: "center",
    }}>
      <div style={{ fontSize: "24px", fontWeight: 700, color: color ?? "var(--j-text)" }}>{value}</div>
      <div style={{ fontSize: "11px", color: "var(--j-text-muted)", marginTop: "2px" }}>{label}</div>
    </div>
  );
}

function HealthBar({ label, count, total, color }: { label: string; count: number; total: number; color: string }) {
  const pct = total > 0 ? (count / total) * 100 : 0;
  return (
    <div style={{ marginBottom: "8px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", marginBottom: "2px" }}>
        <span style={{ color: "var(--j-text)" }}>{label}</span>
        <span style={{ color: "var(--j-text-muted)" }}>{count} ({pct.toFixed(0)}%)</span>
      </div>
      <div style={{ height: "6px", background: "var(--j-border)", borderRadius: "3px", overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: "3px" }} />
      </div>
    </div>
  );
}
