import { useState, useEffect } from "react";
import axios from "axios";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";

const API_URL = "https://focus-api-vg34.onrender.com";
const API_KEY = "focus-dev-key-2026";
const headers = { "X-API-Key": API_KEY };

const COLORS = { maneuver: "#fc8181", replan: "#f6ad55", wait: "#68d391" };

const defaultCDM = {
  norad_id_primary: 25544,
  norad_id_secondary: 48274,
  tca_hours: 12.5,
  miss_distance_m: 150,
  pc: 0.0003,
  dv_available_ms: 2.5,
  cdm_reliability: 0.85,
};

const Badge = ({ decision }) => {
  const colors = { maneuver: "#fc8181", replan: "#f6ad55", wait: "#68d391" };
  const icons = { maneuver: "🚨", replan: "⚠️", wait: "✅" };
  const c = colors[decision] || "#718096";
  return (
    <span style={{
      background: `${c}18`, color: c, border: `1px solid ${c}44`,
      borderRadius: "6px", padding: "3px 10px", fontSize: "10px",
      fontWeight: "600", letterSpacing: "1.5px", fontFamily: "JetBrains Mono, monospace",
      display: "inline-flex", alignItems: "center", gap: "4px"
    }}>
      {icons[decision]} {decision?.toUpperCase()}
    </span>
  );
};

const StatCard = ({ icon, label, value, color, sub }) => (
  <div className="card" style={{ padding: "24px", position: "relative", overflow: "hidden" }}>
    <div style={{
      position: "absolute", top: 0, right: 0, width: "80px", height: "80px",
      background: `radial-gradient(circle, ${color}15 0%, transparent 70%)`,
      borderRadius: "0 16px 0 0"
    }} />
    <div style={{ fontSize: "22px", marginBottom: "12px" }}>{icon}</div>
    <div style={{ fontSize: "36px", fontWeight: "700", color, fontFamily: "JetBrains Mono, monospace", lineHeight: 1 }}>{value}</div>
    <div style={{ fontSize: "11px", color: "var(--text-secondary)", marginTop: "6px", letterSpacing: "1px", textTransform: "uppercase" }}>{label}</div>
    {sub && <div style={{ fontSize: "10px", color: "var(--text-dim)", marginTop: "4px" }}>{sub}</div>}
  </div>
);

export default function App() {
  const [decisions, setDecisions] = useState([]);
  const [satellites, setSatellites] = useState([]);
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [cdm, setCdm] = useState(defaultCDM);
  const [result, setResult] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(new Date());

  const fetchData = async () => {
    try {
      const [decRes, satRes, healthRes] = await Promise.all([
        axios.get(`${API_URL}/v1/decisions`, { headers }),
        axios.get(`${API_URL}/v1/satellites`, { headers }),
        axios.get(`${API_URL}/v1/health`),
      ]);
      setDecisions(decRes.data);
      setSatellites(satRes.data);
      setHealth(healthRes.data);
      setLastUpdate(new Date());
    } catch (e) {
      setHealth(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 15000);
    return () => clearInterval(interval);
  }, []);

  const handleSubmit = async () => {
    setSubmitting(true);
    setResult(null);
    try {
      const res = await axios.post(`${API_URL}/v1/decide`, cdm, { headers });
      setResult(res.data);
      setTimeout(fetchData, 1000);
    } catch (e) {
      setResult({ error: "Erreur de connexion à l'API FOCUS" });
    } finally {
      setSubmitting(false);
    }
  };

  const pieData = [
    { name: "Manœuvre", value: decisions.filter(d => d.decision === "maneuver").length },
    { name: "Replanning", value: decisions.filter(d => d.decision === "replan").length },
    { name: "Attente", value: decisions.filter(d => d.decision === "wait").length },
  ].filter(d => d.value > 0);

  const avgConfidence = decisions.length
    ? (decisions.reduce((s, d) => s + d.confidence, 0) / decisions.length * 100).toFixed(1)
    : 0;

  return (
    <div style={{ minHeight: "100vh", padding: "24px 32px", maxWidth: "1400px", margin: "0 auto" }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "32px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <div style={{
            width: "48px", height: "48px", borderRadius: "12px",
            background: "linear-gradient(135deg, #63b3ed22, #68d39122)",
            border: "1px solid var(--border-bright)",
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: "24px"
          }}>🛰️</div>
          <div>
            <h1 style={{ fontSize: "22px", fontWeight: "700", color: "var(--blue-bright)", letterSpacing: "4px", margin: 0 }}>
              FOCUS
            </h1>
            <p style={{ fontSize: "10px", color: "var(--text-dim)", letterSpacing: "2px", margin: 0, marginTop: "2px" }}>
              SPACE COLLISION AVOIDANCE · HYBRID AND ENGINE C3+C4 INPI
            </p>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: "10px", color: "var(--text-dim)", letterSpacing: "1px" }}>DERNIÈRE MAJ</div>
            <div style={{ fontSize: "11px", color: "var(--text-secondary)", fontFamily: "JetBrains Mono, monospace" }}>
              {lastUpdate.toLocaleTimeString("fr-FR")}
            </div>
          </div>
          <div style={{
            display: "flex", alignItems: "center", gap: "8px",
            background: health ? "rgba(104, 211, 145, 0.08)" : "rgba(252, 129, 129, 0.08)",
            border: `1px solid ${health ? "#68d39144" : "#fc818144"}`,
            borderRadius: "10px", padding: "10px 16px"
          }}>
            <div style={{
              width: "8px", height: "8px", borderRadius: "50%",
              background: health ? "#68d391" : "#fc8181",
              animation: "pulse 2s infinite"
            }} />
            <span style={{ fontSize: "12px", color: health ? "#68d391" : "#fc8181", fontWeight: "500" }}>
              {health ? `OPÉRATIONNEL · v${health.version}` : "HORS LIGNE"}
            </span>
          </div>
        </div>
      </div>

      {/* Stats Row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px", marginBottom: "24px" }}>
        <StatCard icon="🛰️" label="Satellites suivis" value={satellites.length} color="var(--blue)" />
        <StatCard icon="📊" label="Décisions COLA" value={decisions.length} color="var(--purple)" />
        <StatCard icon="🚨" label="Manœuvres requises" value={decisions.filter(d => d.decision === "maneuver").length} color="var(--red)" sub={decisions.length ? `${((decisions.filter(d => d.decision === "maneuver").length / decisions.length) * 100).toFixed(0)}% des décisions` : ""} />
        <StatCard icon="🎯" label="Confiance moyenne" value={`${avgConfidence}%`} color="var(--green)" />
      </div>

      {/* Main Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "20px" }}>

        {/* Formulaire CDM */}
        <div className="card" style={{ padding: "28px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "24px" }}>
            <div style={{ width: "4px", height: "20px", background: "var(--blue)", borderRadius: "2px" }} />
            <h2 style={{ fontSize: "13px", color: "var(--blue-bright)", letterSpacing: "2px", margin: 0 }}>
              ANALYSER UN CDM
            </h2>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "20px" }}>
            {Object.entries(cdm).map(([key, val]) => (
              <div key={key}>
                <label style={{ fontSize: "9px", color: "var(--text-dim)", letterSpacing: "1px", display: "block", marginBottom: "6px", textTransform: "uppercase" }}>
                  {key.replace(/_/g, " ")}
                </label>
                <input
                  type="number"
                  step="any"
                  value={val}
                  onChange={e => setCdm({ ...cdm, [key]: parseFloat(e.target.value) || 0 })}
                />
              </div>
            ))}
          </div>

          <button
            onClick={handleSubmit}
            disabled={submitting}
            style={{
              width: "100%",
              background: submitting
                ? "rgba(99, 179, 237, 0.05)"
                : "linear-gradient(135deg, rgba(99, 179, 237, 0.15), rgba(104, 211, 145, 0.08))",
              border: `1px solid ${submitting ? "var(--border)" : "var(--blue)"}`,
              borderRadius: "10px", padding: "14px",
              color: submitting ? "var(--text-dim)" : "var(--blue-bright)",
              fontSize: "12px", fontFamily: "JetBrains Mono, monospace",
              letterSpacing: "2px", fontWeight: "600",
            }}
          >
            {submitting ? "◌ ANALYSE EN COURS..." : "▶ LANCER L'ANALYSE HYBRID AND"}
          </button>

          {result && (
            <div style={{
              marginTop: "16px", padding: "20px",
              background: result.error
                ? "rgba(252, 129, 129, 0.05)"
                : `${COLORS[result.decision] || "#68d391"}0d`,
              border: `1px solid ${result.error ? "#fc818133" : `${COLORS[result.decision] || "#68d391"}33`}`,
              borderRadius: "12px", animation: "slideIn 0.3s ease"
            }}>
              {result.error ? (
                <p style={{ color: "var(--red)", margin: 0, fontSize: "12px" }}>{result.error}</p>
              ) : (
                <>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                    <Badge decision={result.decision} />
                    <span style={{ color: "var(--purple)", fontSize: "13px", fontFamily: "JetBrains Mono, monospace", fontWeight: "600" }}>
                      {(result.confidence * 100).toFixed(0)}% confiance
                    </span>
                  </div>
                  <p style={{ margin: 0, fontSize: "11px", color: "var(--text-secondary)", lineHeight: "1.6" }}>
                    {result.reasoning}
                  </p>
                  {result.recommended_dv_ms && (
                    <div style={{
                      marginTop: "12px", padding: "8px 12px",
                      background: "rgba(99, 179, 237, 0.08)", borderRadius: "6px",
                      fontSize: "12px", color: "var(--blue)", fontFamily: "JetBrains Mono, monospace"
                    }}>
                      ΔV recommandé : <strong>{result.recommended_dv_ms} m/s</strong>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        {/* Right column */}
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>

          {/* Pie Chart */}
          {pieData.length > 0 && (
            <div className="card" style={{ padding: "28px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "20px" }}>
                <div style={{ width: "4px", height: "20px", background: "var(--purple)", borderRadius: "2px" }} />
                <h2 style={{ fontSize: "13px", color: "var(--blue-bright)", letterSpacing: "2px", margin: 0 }}>
                  RÉPARTITION DES DÉCISIONS
                </h2>
              </div>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={3} dataKey="value">
                    {pieData.map((entry) => (
                      <Cell key={entry.name} fill={COLORS[entry.name === "Manœuvre" ? "maneuver" : entry.name === "Replanning" ? "replan" : "wait"]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ background: "#0a0f1e", border: "1px solid rgba(99,179,237,0.2)", borderRadius: "8px", fontSize: "11px" }}
                    labelStyle={{ color: "var(--text-primary)" }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ display: "flex", justifyContent: "center", gap: "16px", marginTop: "8px" }}>
                {pieData.map(d => (
                  <div key={d.name} style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11px", color: "var(--text-secondary)" }}>
                    <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: COLORS[d.name === "Manœuvre" ? "maneuver" : d.name === "Replanning" ? "replan" : "wait"] }} />
                    {d.name} ({d.value})
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Satellites */}
          <div className="card" style={{ padding: "28px", flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "20px" }}>
              <div style={{ width: "4px", height: "20px", background: "var(--green)", borderRadius: "2px" }} />
              <h2 style={{ fontSize: "13px", color: "var(--blue-bright)", letterSpacing: "2px", margin: 0 }}>
                CONSTELLATION
              </h2>
            </div>
            {satellites.length === 0 ? (
              <div style={{ color: "var(--text-dim)", textAlign: "center", padding: "24px", fontSize: "12px" }}>
                Aucun satellite enregistré
              </div>
            ) : (
              satellites.map(sat => (
                <div key={sat.id} style={{
                  background: "rgba(99, 179, 237, 0.04)", border: "1px solid var(--border)",
                  borderRadius: "10px", padding: "14px 16px", marginBottom: "8px",
                  display: "flex", justifyContent: "space-between", alignItems: "center"
                }}>
                  <div>
                    <div style={{ color: "var(--blue-bright)", fontSize: "13px", fontWeight: "600" }}>{sat.name}</div>
                    <div style={{ color: "var(--text-dim)", fontSize: "10px", fontFamily: "JetBrains Mono, monospace", marginTop: "2px" }}>
                      NORAD #{sat.norad_id} · {sat.altitude_km}km · {sat.inclination_deg}°
                    </div>
                  </div>
                  <Badge decision={sat.status === "active" ? "wait" : "maneuver"} />
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Historique */}
      <div className="card" style={{ padding: "28px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "24px" }}>
          <div style={{ width: "4px", height: "20px", background: "var(--orange)", borderRadius: "2px" }} />
          <h2 style={{ fontSize: "13px", color: "var(--blue-bright)", letterSpacing: "2px", margin: 0 }}>
            HISTORIQUE DES DÉCISIONS COLA
          </h2>
          <div style={{ marginLeft: "auto", fontSize: "11px", color: "var(--text-dim)" }}>
            {decisions.length} décision{decisions.length > 1 ? "s" : ""} enregistrée{decisions.length > 1 ? "s" : ""}
          </div>
        </div>

        {loading ? (
          <div style={{ color: "var(--text-dim)", textAlign: "center", padding: "40px", fontSize: "12px" }}>
            Chargement des données...
          </div>
        ) : decisions.length === 0 ? (
          <div style={{ color: "var(--text-dim)", textAlign: "center", padding: "40px", fontSize: "12px" }}>
            Aucune décision enregistrée — lancez votre première analyse CDM
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border)" }}>
                  {["ID", "PRIMAIRE", "SECONDAIRE", "Pc", "DISTANCE", "TCA", "DÉCISION", "CONFIANCE", "ΔV", "HORODATAGE"].map(h => (
                    <th key={h} style={{
                      padding: "8px 14px", textAlign: "left", color: "var(--text-dim)",
                      fontSize: "9px", letterSpacing: "1.5px", fontWeight: "600", textTransform: "uppercase"
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {decisions.map((d, i) => (
                  <tr key={d.id} style={{
                    borderBottom: "1px solid rgba(99, 179, 237, 0.05)",
                    background: i % 2 === 0 ? "transparent" : "rgba(99, 179, 237, 0.02)",
                    transition: "background 0.2s"
                  }}
                    onMouseEnter={e => e.currentTarget.style.background = "rgba(99, 179, 237, 0.06)"}
                    onMouseLeave={e => e.currentTarget.style.background = i % 2 === 0 ? "transparent" : "rgba(99, 179, 237, 0.02)"}
                  >
                    <td style={{ padding: "12px 14px", color: "var(--text-dim)", fontFamily: "JetBrains Mono, monospace" }}>#{d.id}</td>
                    <td style={{ padding: "12px 14px", color: "var(--blue)", fontFamily: "JetBrains Mono, monospace" }}>{d.norad_id_primary}</td>
                    <td style={{ padding: "12px 14px", fontFamily: "JetBrains Mono, monospace" }}>{d.norad_id_secondary}</td>
                    <td style={{ padding: "12px 14px", color: d.pc > 1e-4 ? "var(--red)" : "var(--green)", fontFamily: "JetBrains Mono, monospace" }}>
                      {d.pc.toExponential(2)}
                    </td>
                    <td style={{ padding: "12px 14px", fontFamily: "JetBrains Mono, monospace" }}>{d.miss_distance_m}m</td>
                    <td style={{ padding: "12px 14px", fontFamily: "JetBrains Mono, monospace" }}>{d.tca_hours}h</td>
                    <td style={{ padding: "12px 14px" }}><Badge decision={d.decision} /></td>
                    <td style={{ padding: "12px 14px", color: "var(--purple)", fontFamily: "JetBrains Mono, monospace" }}>
                      {(d.confidence * 100).toFixed(0)}%
                    </td>
                    <td style={{ padding: "12px 14px", color: "var(--blue)", fontFamily: "JetBrains Mono, monospace" }}>
                      {d.recommended_dv_ms ? `${d.recommended_dv_ms} m/s` : "—"}
                    </td>
                    <td style={{ padding: "12px 14px", color: "var(--text-dim)", fontSize: "10px", fontFamily: "JetBrains Mono, monospace" }}>
                      {new Date(d.created_at).toLocaleString("fr-FR")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{ textAlign: "center", marginTop: "32px", padding: "16px", borderTop: "1px solid var(--border)" }}>
        <p style={{ fontSize: "10px", color: "var(--text-dim)", letterSpacing: "2px" }}>
          FOCUS SPACE TECHNOLOGIES · HYBRID AND ENGINE · CONTRIBUTIONS C3+C4 INPI · 
          <span style={{ color: "var(--blue)" }}> ESA KELVINS 100% RECALL −38% FALSE ALERTS</span>
        </p>
      </div>
    </div>
  );
}
