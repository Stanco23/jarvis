import type { Goal } from "../../pages/GoalsPage";

type Props = {
  goals: Goal[];
  onSelect: (goal: Goal) => void;
};

const healthColors: Record<string, string> = {
  on_track: "var(--j-success)",
  at_risk: "var(--j-warning)",
  behind: "#f97316",
  critical: "var(--j-error)",
};

const levelIndent: Record<string, number> = {
  objective: 0,
  key_result: 1,
  milestone: 2,
  task: 3,
  daily_action: 4,
};

export function GoalTimeline({ goals, onSelect }: Props) {
  // Build tree structure
  const roots = goals.filter(g => !g.parent_id);
  const childMap = new Map<string, Goal[]>();
  for (const g of goals) {
    if (g.parent_id) {
      const siblings = childMap.get(g.parent_id) ?? [];
      siblings.push(g);
      childMap.set(g.parent_id, siblings);
    }
  }

  // Flatten into ordered list with hierarchy
  const ordered: Goal[] = [];
  function traverse(goalId: string) {
    const goal = goals.find(g => g.id === goalId);
    if (!goal) return;
    ordered.push(goal);
    const children = childMap.get(goalId) ?? [];
    children.sort((a, b) => a.sort_order - b.sort_order);
    for (const child of children) traverse(child.id);
  }
  for (const root of roots.sort((a, b) => a.sort_order - b.sort_order)) {
    traverse(root.id);
  }

  // Time range for the Gantt chart
  const now = Date.now();
  const allStarts = ordered.map(g => g.started_at ?? g.created_at);
  const allEnds = ordered.map(g => g.deadline ?? now + 30 * 86400000);
  const minTime = Math.min(...allStarts, now - 7 * 86400000);
  const maxTime = Math.max(...allEnds, now + 30 * 86400000);
  const totalDuration = maxTime - minTime;

  const toPercent = (t: number) => ((t - minTime) / totalDuration) * 100;
  const nowPercent = toPercent(now);

  return (
    <div style={{ padding: "16px 24px", overflow: "auto", height: "100%" }}>
      {/* Month markers */}
      <div style={{ position: "relative", height: "24px", marginBottom: "4px", marginLeft: "200px" }}>
        {generateMonthMarkers(minTime, maxTime).map(({ label, percent }) => (
          <div key={label + percent} style={{
            position: "absolute",
            left: `${percent}%`,
            fontSize: "10px",
            color: "var(--j-text-muted)",
            transform: "translateX(-50%)",
          }}>
            {label}
          </div>
        ))}
        {/* Today marker */}
        <div style={{
          position: "absolute",
          left: `${nowPercent}%`,
          top: 0,
          bottom: "-1000px",
          width: "1px",
          background: "var(--j-accent)",
          opacity: 0.4,
          zIndex: 1,
        }} />
      </div>

      {/* Goal rows */}
      {ordered.map((goal) => {
        const indent = (levelIndent[goal.level] ?? 0) * 16;
        const start = goal.started_at ?? goal.created_at;
        const end = goal.deadline ?? (goal.completed_at ?? now + 14 * 86400000);
        const leftPct = toPercent(start);
        const widthPct = Math.max(1, toPercent(end) - leftPct);
        const barColor = healthColors[goal.health] ?? "var(--j-text-muted)";
        const isDone = goal.status === "completed" || goal.status === "failed" || goal.status === "killed";

        return (
          <div key={goal.id} style={{
            display: "flex",
            alignItems: "center",
            height: "28px",
            marginBottom: "2px",
            cursor: "pointer",
          }} onClick={() => onSelect(goal)}>
            {/* Label */}
            <div style={{
              width: "200px",
              minWidth: "200px",
              paddingLeft: `${indent}px`,
              fontSize: "12px",
              color: isDone ? "var(--j-text-muted)" : "var(--j-text)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              textDecoration: isDone ? "line-through" : "none",
            }}>
              {goal.title}
            </div>

            {/* Bar area */}
            <div style={{ flex: 1, position: "relative", height: "16px" }}>
              <div style={{
                position: "absolute",
                left: `${leftPct}%`,
                width: `${widthPct}%`,
                height: "100%",
                background: isDone ? "var(--j-text-muted)" : barColor,
                opacity: isDone ? 0.3 : 0.6,
                borderRadius: "3px",
                transition: "opacity 0.15s",
              }} />
              {/* Score fill within bar */}
              {!isDone && (
                <div style={{
                  position: "absolute",
                  left: `${leftPct}%`,
                  width: `${widthPct * goal.score}%`,
                  height: "100%",
                  background: barColor,
                  borderRadius: "3px 0 0 3px",
                }} />
              )}
            </div>
          </div>
        );
      })}

      {ordered.length === 0 && (
        <div style={{ textAlign: "center", padding: "40px", color: "var(--j-text-muted)", fontSize: "13px" }}>
          No goals to display. Create your first goal to see the timeline.
        </div>
      )}
    </div>
  );
}

function generateMonthMarkers(minTime: number, maxTime: number): { label: string; percent: number }[] {
  const markers: { label: string; percent: number }[] = [];
  const start = new Date(minTime);
  start.setDate(1);
  start.setHours(0, 0, 0, 0);

  const totalDuration = maxTime - minTime;
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  while (start.getTime() < maxTime) {
    const pct = ((start.getTime() - minTime) / totalDuration) * 100;
    if (pct >= 0 && pct <= 100) {
      markers.push({
        label: `${months[start.getMonth()]} ${start.getFullYear()}`,
        percent: pct,
      });
    }
    start.setMonth(start.getMonth() + 1);
  }

  return markers;
}
