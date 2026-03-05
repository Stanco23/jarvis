import type { Goal } from "../../pages/GoalsPage";

type Props = {
  goal: Goal;
  onClick: (goal: Goal) => void;
};

const healthColors: Record<string, string> = {
  on_track: "var(--j-success)",
  at_risk: "var(--j-warning)",
  behind: "#f97316",
  critical: "var(--j-error)",
};

const levelIcons: Record<string, string> = {
  objective: "\u25C6",
  key_result: "\u25B8",
  milestone: "\u25A0",
  task: "\u25CB",
  daily_action: "\u2022",
};

function scoreColor(score: number): string {
  if (score >= 0.7) return "var(--j-success)";
  if (score >= 0.4) return "var(--j-warning)";
  if (score > 0) return "#f97316";
  return "var(--j-text-muted)";
}

export function GoalCard({ goal, onClick }: Props) {
  const daysLeft = goal.deadline
    ? Math.ceil((goal.deadline - Date.now()) / 86400000)
    : null;

  return (
    <div
      onClick={() => onClick(goal)}
      style={{
        padding: "12px",
        background: "var(--j-surface)",
        border: "1px solid var(--j-border)",
        borderRadius: "8px",
        cursor: "pointer",
        transition: "border-color 0.15s",
        borderLeft: `3px solid ${healthColors[goal.health] ?? "var(--j-border)"}`,
      }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--j-accent-dim)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--j-border)"; e.currentTarget.style.borderLeftColor = healthColors[goal.health] ?? "var(--j-border)"; }}
    >
      {/* Title row */}
      <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "6px" }}>
        <span style={{ fontSize: "12px", color: "var(--j-text-muted)" }}>
          {levelIcons[goal.level] ?? ""}
        </span>
        <span style={{ fontSize: "13px", fontWeight: 500, color: "var(--j-text)", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {goal.title}
        </span>
      </div>

      {/* Score bar */}
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
        <div style={{
          flex: 1,
          height: "4px",
          background: "var(--j-border)",
          borderRadius: "2px",
          overflow: "hidden",
        }}>
          <div style={{
            width: `${goal.score * 100}%`,
            height: "100%",
            background: scoreColor(goal.score),
            borderRadius: "2px",
            transition: "width 0.3s",
          }} />
        </div>
        <span style={{ fontSize: "11px", fontWeight: 600, color: scoreColor(goal.score), minWidth: "28px", textAlign: "right" }}>
          {goal.score.toFixed(1)}
        </span>
      </div>

      {/* Meta row */}
      <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "11px", color: "var(--j-text-muted)" }}>
        <span style={{ textTransform: "capitalize" }}>{goal.level.replace("_", " ")}</span>
        {daysLeft !== null && (
          <span style={{ color: daysLeft < 0 ? "var(--j-error)" : daysLeft < 7 ? "var(--j-warning)" : "var(--j-text-muted)" }}>
            {daysLeft < 0 ? `${Math.abs(daysLeft)}d overdue` : `${daysLeft}d left`}
          </span>
        )}
        {goal.escalation_stage !== "none" && (
          <span style={{ color: "var(--j-error)", fontWeight: 600 }}>
            {goal.escalation_stage.replace("_", " ").toUpperCase()}
          </span>
        )}
        {goal.tags.length > 0 && (
          <span>{goal.tags.slice(0, 2).join(", ")}</span>
        )}
      </div>
    </div>
  );
}
