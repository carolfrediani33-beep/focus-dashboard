import { useState, useEffect } from "react";
import axios from "axios";

function TimelineSat({ sat, predictions, decisions }) {
  const lastDecision = decisions.filter(d => d.norad_id_primary === sat.norad_id).sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0];
  const highRiskPoints = (predictions || []).filter(p => p.risk > 1e-6);
  const maxRisk = predictions?.length ? Math.max(...predictions.map(p => p.risk ?? 0)) : 0;
  const maneuverZone = highRiskPoints.length > 0 ? highRiskPoints[Math.floor(highRiskPoints.length / 2)] : null;
  const decColor = lastDecision?.decision === "maneuver" ? "var(--red)" : lastDecision?.decision === "replan" ? "var(--amber)" : "var(--green)";
  const decGlow = lastDecision?.decision === "maneuver" ? "var(--red-glow)" : lastDecision?.decision === "replan" ? "var(--amber-glow)" : "var(--green-glow)";

  return (
    <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--border)", display: "grid", gridTemplateColumns: "180px 1fr 180px", gap: 16, alignItems: "center" }}>
      <div>
        <div style={{ fontSize: 12, color: "var(--text)", fontWeight: 500, marginBottom: 3 }}>{sat.name}</div>
        <div style={{ fontFamily: "var(--mono)", fontSize: 9, color: "var(--text-3)" }}>#{sat.norad_id} · {sat.altitude_km} km</div>
        {lastDecision && (
          <div style={{ marginTop: 6 }}>
            <span style={{ fontFamily: "var(--mono)", fontSize: 8, letterSpacing: "0.08em", padding: "2px 6px", borderRadius: 3, color: decColor, background: decGlow, border: `1px solid ${decColor}40` }}>
              {lastDecision.decision.toUpperCase()}
            </span>
          </div>
        )}
      </div>
      <div style={{ position: "relative", height: 48 }}>
        <div style={{ position: "absolute", bottom: 16, left: 0, right: 0, height: 1, background: "var(--border)" }} />
        {[0, 6, 12, 18, 24].map(h => (
          <div key={h} style={{ position: "absolute", bottom: 2, left: `${(h / 24) * 100}%`, transform: "translateX(-50%)", fontFamily: "var(--mono)", fontSize: 8, color: "var(--text-3)" }}>+{h}h</div>
        ))}
        {highRiskPoints.length > 0 && (() => {
          const minT = Math.min(...highRiskPoints.map(p => p.time_offset_h ?? 0));
          const maxT = Math.max(...highRiskPoints.map(p => p.time_offset_h ?? 0));
          return <div style={{ position: "absolute", bottom: 12, left: `${(minT / 24) * 100}%`, width: `${Math.max((maxT - minT) / 24 * 100, 2)}%`, height: 8, borderRadius: 2, background: "var(--red)60", border: "1px solid var(--red)80" }} />;
        })()}
        {maneuverZone && (() => {
          const t = maneuverZone.time_offset_h ?? 6;
          return (
            <div style={{ position: "absolute", bottom: 12, left: `${(t / 24) * 100}%`, transform: "translateX(-50%)", display: "flex", flexDirection: "column", alignItems: "center" }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--amber)", boxShadow: "0 0 8px var(--amber)" }} />
              <div style={{ fontFamily: "var(--mono)", fontSize: 7, color: "var(--amber)", marginTop: 2, whiteSpace: "nowrap" }}>OPT. WINDOW</div>
            </div>
          );
        })()}
        {!predictions && <div style={{ position: "absolute", bottom: 18, left: "50%", transform: "translateX(-50%)", fontFamily: "var(--mono)", fontSize: 9, color: "var(--text-3)" }}>no propagation data</div>}
      </div>
      <div style={{ textAlign: "right" }}>
        {maxRisk > 0 ? (
          <>
            <div style={{ fontFamily: "var(--mono)", fontSize: 18, fontWeight: 500, color: maxRisk > 1e-4 ? "var(--red)" : maxRisk > 1e-6 ? "var(--amber)" : "var(--green)", lineHeight: 1 }}>{maxRisk.toExponential(1)}</div>
            <div style={{ fontFamily: "var(--mono)", fontSize: 8, color: "var(--text-3)", marginTop: 4, letterSpacing: "0.08em" }}>MAX P(collision) 24h</div>
          </>
        ) : (
          <div style={{ fontFamily: "var(--mono)", fontSize: 9, color: "var(--green)" }}>NOMINAL</div>
        )}
      </div>
    </div>
  );
}

export default function ManeuverTimeline({ satellites = [], decisions = [], apiUrl, headers }) {
  const [sgp4Data, setSgp4Data] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (satellites.length === 0) return;
    setLoading(true);
    Promise.all(
      satellites.map(sat =>
        axios.get(`${apiUrl}/v1/predict/${sat.norad_id}`, { headers })
          .then(r => ({ id: sat.norad_id, data: r.data }))
          .catch(() => ({ id: sat.norad_id, data: null }))
      )
    ).then(results => {
      const map = {};
      results.forEach(({ id, data }) => { map[id] = data; });
      setSgp4Data(map);
      setLoading(false);
    });
  }, [satellites]);

  if (satellites.length === 0) return null;

  return (
    <div>
      <div style={{ padding: "14px 24px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 3, height: 12, background: "var(--amber)", borderRadius: 2 }} />
          <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--text-2)" }}>Maneuver Timeline</span>
        </div>
        <span style={{ fontFamily: "var(--mono)", fontSize: 9, color: "var(--text-3)", letterSpacing: "0.08em" }}>SGP4 · NEXT 24H · {satellites.length} OBJECTS</span>
      </div>
      <div style={{ padding: "8px 20px", borderBottom: "1px solid var(--border)", display: "flex", gap: 20, background: "var(--bg-1)" }}>
        {[{ color: "var(--red)", label: "High-risk window" }, { color: "var(--amber)", label: "Optimal maneuver" }, { color: "var(--border)", label: "Timeline axis" }].map(({ color, label }) => (
          <div key={label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ width: 12, height: 4, borderRadius: 2, background: color }} />
            <span style={{ fontSize: 9, color: "var(--text-3)" }}>{label}</span>
          </div>
        ))}
      </div>
      {loading ? (
        <div style={{ padding: 24, fontFamily: "var(--mono)", fontSize: 11, color: "var(--text-3)" }}>Computing SGP4 trajectories...</div>
      ) : (
        satellites.map(sat => <TimelineSat key={sat.norad_id} sat={sat} predictions={sgp4Data[sat.norad_id]} decisions={decisions} />)
      )}
    </div>
  );
}
