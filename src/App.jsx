import { useState, useEffect } from "react";
import axios from "axios";

const API_URL = "https://focus-api-vg34.onrender.com";
const API_KEY = "focus-dev-key-2026";
const headers = { "X-API-Key": API_KEY };

const statusColor = (decision) => {
  if (decision === "maneuver") return "#ff4444";
  if (decision === "replan") return "#ff9900";
  return "#00cc66";
};

const defaultCDM = {
  norad_id_primary: 25544,
  norad_id_secondary: 48274,
  tca_hours: 12.5,
  miss_distance_m: 150,
  pc: 0.0003,
  dv_available_ms: 2.5,
  cdm_reliability: 0.85,
};

export default function App() {
  const [decisions, setDecisions] = useState([]);
  const [satellites, setSatellites] = useState([]);
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [cdm, setCdm] = useState(defaultCDM);
  const [result, setResult] = useState(null);
  const [submitting, setSubmitting] = useState(false);

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
    } catch (e) {
      console.error(e);
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
      fetchData();
    } catch (e) {
      setResult({ error: "Erreur API" });
    } finally {
      setSubmitting(false);
    }
  };

  const s = { background: "#0a0e1a", minHeight: "100vh", color: "#e0e6ff", fontFamily: "'JetBrains Mono', 'Courier New', monospace", padding: "24px 32px" };

  return (
    <div style={s}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "40px", borderBottom: "1px solid #1e293b", paddingBottom: "20px" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <span style={{ fontSize: "32px" }}>🛰️</span>
            <div>
              <h1 style={{ margin: 0, fontSize: "24px", color: "#4fc3f7", letterSpacing: "3px", fontWeight: "700" }}>FOCUS</h1>
              <p style={{ margin: 0, fontSize: "11px", color: "#546e7a", letterSpacing: "2px" }}>SPACE COLLISION AVOIDANCE SYSTEM</p>
            </div>
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{
            background: health ? "#00cc6611" : "#ff444411",
            border: `1px solid ${health ? "#00cc66" : "#ff4444"}`,
            borderRadius: "6px", padding: "8px 16px", fontSize: "12px",
            color: health ? "#00cc66" : "#ff4444", letterSpacing: "1px"
          }}>
            {health ? `● SYSTÈME OPÉRATIONNEL — v${health.version}` : "● SYSTÈME HORS LIGNE"}
          </div>
          <p style={{ margin: "4px 0 0", fontSize: "11px", color: "#546e7a" }}>
            {new Date().toLocaleString("fr-FR")} UTC
          </p>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px", marginBottom: "32px" }}>
        {[
          { label: "SATELLITES SUIVIS", value: satellites.length, color: "#4fc3f7", icon: "🛰️" },
          { label: "DÉCISIONS TOTAL", value: decisions.length, color: "#ab47bc", icon: "📊" },
          { label: "MANŒUVRES", value: decisions.filter(d => d.decision === "maneuver").length, color: "#ff4444", icon: "🚨" },
          { label: "TAUX ALERTE", value: decisions.length ? `${((decisions.filter(d => d.decision === "maneuver").length / decisions.length) * 100).toFixed(0)}%` : "0%", color: "#ff9900", icon: "⚡" },
        ].map((stat) => (
          <div key={stat.label} style={{
            background: "#0d1424", border: "1px solid #1e293b",
            borderRadius: "12px", padding: "20px", textAlign: "center",
            boxShadow: `0 0 20px ${stat.color}11`
          }}>
            <div style={{ fontSize: "24px", marginBottom: "8px" }}>{stat.icon}</div>
            <div style={{ fontSize: "32px", fontWeight: "bold", color: stat.color }}>{stat.value}</div>
            <div style={{ fontSize: "10px", color: "#546e7a", marginTop: "4px", letterSpacing: "1px" }}>{stat.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px", marginBottom: "24px" }}>
        {/* Formulaire COLA */}
        <div style={{ background: "#0d1424", border: "1px solid #1e293b", borderRadius: "12px", padding: "24px" }}>
          <h2 style={{ margin: "0 0 20px", fontSize: "13px", color: "#4fc3f7", letterSpacing: "2px" }}>
            ⚡ ANALYSER UN CDM
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "16px" }}>
            {Object.entries(cdm).map(([key, val]) => (
              <div key={key}>
                <label style={{ fontSize: "10px", color: "#546e7a", letterSpacing: "1px", display: "block", marginBottom: "4px" }}>
                  {key.replace(/_/g, " ").toUpperCase()}
                </label>
                <input
                  type="number"
                  value={val}
                  onChange={e => setCdm({ ...cdm, [key]: parseFloat(e.target.value) })}
                  style={{
                    width: "100%", background: "#111827", border: "1px solid #1e293b",
                    borderRadius: "6px", padding: "8px", color: "#e0e6ff",
                    fontSize: "12px", fontFamily: "monospace", boxSizing: "border-box"
                  }}
                />
              </div>
            ))}
          </div>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            style={{
              width: "100%", background: submitting ? "#1e293b" : "#4fc3f711",
              border: "1px solid #4fc3f7", borderRadius: "8px", padding: "12px",
              color: "#4fc3f7", fontSize: "13px", fontFamily: "monospace",
              cursor: submitting ? "not-allowed" : "pointer", letterSpacing: "2px",
              transition: "all 0.2s"
            }}
          >
            {submitting ? "ANALYSE EN COURS..." : "▶ LANCER L'ANALYSE HYBRID AND"}
          </button>

          {result && (
            <div style={{
              marginTop: "16px", padding: "16px",
              background: result.error ? "#ff444411" : `${statusColor(result.decision)}11`,
              border: `1px solid ${result.error ? "#ff4444" : statusColor(result.decision)}`,
              borderRadius: "8px"
            }}>
              {result.error ? (
                <p style={{ color: "#ff4444", margin: 0 }}>{result.error}</p>
              ) : (
                <>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                    <span style={{
                      fontSize: "18px", fontWeight: "bold",
                      color: statusColor(result.decision), letterSpacing: "2px"
                    }}>
                      {result.decision === "maneuver" ? "🚨" : result.decision === "replan" ? "⚠️" : "✅"} {result.decision.toUpperCase()}
                    </span>
                    <span style={{ color: "#ab47bc", fontSize: "14px" }}>
                      {(result.confidence * 100).toFixed(0)}% confiance
                    </span>
                  </div>
                  <p style={{ margin: 0, fontSize: "11px", color: "#94a3b8", lineHeight: "1.5" }}>{result.reasoning}</p>
                  {result.recommended_dv_ms && (
                    <p style={{ margin: "8px 0 0", fontSize: "12px", color: "#4fc3f7" }}>
                      ΔV recommandé : {result.recommended_dv_ms} m/s
                    </p>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        {/* Satellites */}
        <div style={{ background: "#0d1424", border: "1px solid #1e293b", borderRadius: "12px", padding: "24px" }}>
          <h2 style={{ margin: "0 0 20px", fontSize: "13px", color: "#4fc3f7", letterSpacing: "2px" }}>
            🛰️ CONSTELLATION SURVEILLÉE
          </h2>
          {satellites.length === 0 ? (
            <div style={{ color: "#546e7a", textAlign: "center", padding: "40px", fontSize: "12px" }}>
              Aucun satellite enregistré
            </div>
          ) : (
            satellites.map(sat => (
              <div key={sat.id} style={{
                background: "#111827", border: "1px solid #1e293b",
                borderRadius: "8px", padding: "12px", marginBottom: "8px"
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ color: "#4fc3f7", fontSize: "13px", fontWeight: "bold" }}>{sat.name}</div>
                    <div style={{ color: "#546e7a", fontSize: "11px" }}>NORAD #{sat.norad_id}</div>
                  </div>
                  <span style={{
                    fontSize: "10px", padding: "3px 8px", borderRadius: "4px",
                    background: sat.status === "active" ? "#00cc6622" : "#ff444422",
                    color: sat.status === "active" ? "#00cc66" : "#ff4444",
                    border: `1px solid ${sat.status === "active" ? "#00cc66" : "#ff4444"}`
                  }}>
                    {sat.status.toUpperCase()}
                  </span>
                </div>
                {sat.altitude_km && (
                  <div style={{ color: "#546e7a", fontSize: "11px", marginTop: "4px" }}>
                    Alt: {sat.altitude_km} km | Inc: {sat.inclination_deg}°
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Historique */}
      <div style={{ background: "#0d1424", border: "1px solid #1e293b", borderRadius: "12px", padding: "24px" }}>
        <h2 style={{ margin: "0 0 20px", fontSize: "13px", color: "#4fc3f7", letterSpacing: "2px" }}>
          📋 HISTORIQUE DES DÉCISIONS COLA
        </h2>
        {loading ? (
          <div style={{ color: "#546e7a", textAlign: "center", padding: "40px" }}>Chargement...</div>
        ) : decisions.length === 0 ? (
          <div style={{ color: "#546e7a", textAlign: "center", padding: "40px" }}>Aucune décision enregistrée</div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
            <thead>
              <tr style={{ color: "#546e7a", borderBottom: "1px solid #1e293b" }}>
                {["ID", "PRIMAIRE", "SECONDAIRE", "Pc", "DISTANCE", "TCA", "DÉCISION", "CONFIANCE", "ΔV", "DATE"].map(h => (
                  <th key={h} style={{ padding: "8px 12px", textAlign: "left", fontWeight: "normal", letterSpacing: "1px", fontSize: "10px" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {decisions.map((d) => (
                <tr key={d.id} style={{ borderBottom: "1px solid #0d1424", transition: "background 0.2s" }}
                  onMouseEnter={e => e.currentTarget.style.background = "#111827"}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                >
                  <td style={{ padding: "10px 12px", color: "#546e7a" }}>#{d.id}</td>
                  <td style={{ padding: "10px 12px", color: "#4fc3f7" }}>{d.norad_id_primary}</td>
                  <td style={{ padding: "10px 12px" }}>{d.norad_id_secondary}</td>
                  <td style={{ padding: "10px 12px", color: d.pc > 1e-4 ? "#ff4444" : "#00cc66" }}>{d.pc.toExponential(2)}</td>
                  <td style={{ padding: "10px 12px" }}>{d.miss_distance_m}m</td>
                  <td style={{ padding: "10px 12px" }}>{d.tca_hours}h</td>
                  <td style={{ padding: "10px 12px" }}>
                    <span style={{
                      background: statusColor(d.decision) + "22",
                      color: statusColor(d.decision),
                      border: `1px solid ${statusColor(d.decision)}`,
                      borderRadius: "4px", padding: "2px 8px", fontSize: "10px", fontWeight: "bold", letterSpacing: "1px"
                    }}>
                      {d.decision.toUpperCase()}
                    </span>
                  </td>
                  <td style={{ padding: "10px 12px", color: "#ab47bc" }}>{(d.confidence * 100).toFixed(0)}%</td>
                  <td style={{ padding: "10px 12px", color: "#4fc3f7" }}>{d.recommended_dv_ms ? `${d.recommended_dv_ms} m/s` : "—"}</td>
                  <td style={{ padding: "10px 12px", color: "#546e7a", fontSize: "10px" }}>
                    {new Date(d.created_at).toLocaleString("fr-FR")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
