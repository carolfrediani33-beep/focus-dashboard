export default function StatusBar({ health, decisions = [], satellites = [], tleData = {}, mlReady = false }) {
  const activeAlerts = decisions.filter(d => d.decision === "maneuver").length;
  const tleCached = Object.keys(tleData).length;
  const lastDecision = decisions.length > 0 ? decisions[decisions.length - 1] : null;
  const highConf = decisions.filter(d => d.confidence > 0.85).length;
  const items = [
    { label: "API", value: health ? "NOMINAL" : "OFFLINE", color: health ? "var(--green)" : "var(--red)", dot: true },
    { label: "TLE Cache", value: `${tleCached}/${satellites.length}`, color: tleCached === satellites.length ? "var(--green)" : "var(--amber)" },
    { label: "Active Alerts", value: activeAlerts, color: activeAlerts > 0 ? "var(--red)" : "var(--green)" },
    { label: "High Conf.", value: highConf, color: "var(--purple)" },
    { label: "ML Engine", value: mlReady ? "LOADED" : "PENDING", color: mlReady ? "var(--purple)" : "var(--amber)", dot: true },
    { label: "Last Decision", value: lastDecision ? new Date(lastDecision.created_at).toISOString().slice(11,19) + " UTC" : "—", color: "var(--text-2)" },
  ];
  return (
    <div style={{ borderTop: "1px solid var(--border)", borderBottom: "1px solid var(--border)", background: "var(--bg-1)", padding: "0 32px", display: "flex", alignItems: "center", height: 36, gap: 0, overflowX: "auto" }}>
      {items.map((item, i) => (
        <div key={item.label} style={{ display: "flex", alignItems: "center", gap: 6, padding: "0 20px", borderRight: i < items.length - 1 ? "1px solid var(--border)" : "none", flexShrink: 0 }}>
          <span style={{ fontFamily: "var(--mono)", fontSize: 8, letterSpacing: "0.1em", color: "var(--text-3)", textTransform: "uppercase" }}>{item.label}</span>
          {item.dot && <div style={{ width: 5, height: 5, borderRadius: "50%", background: item.color, boxShadow: item.value === "NOMINAL" || item.value === "LOADED" ? `0 0 4px ${item.color}` : "none" }} />}
          <span style={{ fontFamily: "var(--mono)", fontSize: 9, fontWeight: 500, color: item.color, letterSpacing: "0.06em" }}>{item.value}</span>
        </div>
      ))}
    </div>
  );
}
