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

export default function App() {
  const [decisions, setDecisions] = useState([]);
  const [satellites, setSatellites] = useState([]);
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);

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
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{ background: "#0a0e1a", minHeight: "100vh", color: "#e0e6ff", fontFamily: "monospace", padding: "24px" }}>
      
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "32px" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: "28px", color: "#4fc3f7", letterSpacing: "2px" }}>
            🛰️ FOCUS DASHBOARD
          </h1>
          <p style={{ margin: "4px 0 0", color: "#546e7a", fontSize: "12px" }}>
            Space Collision Avoidance — Hybrid AND Engine C3+C4
          </p>
        </div>
        <div style={{ 
          background: health ? "#00cc6622" : "#ff444422", 
          border: `1px solid ${health ? "#00cc66" : "#ff4444"}`,
          borderRadius: "8px", padding: "8px 16px", fontSize: "12px",
          color: health ? "#00cc66" : "#ff4444"
        }}>
          {health ? `✅ API LIVE — v${health.version}` : "❌ API OFFLINE"}
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px", marginBottom: "32px" }}>
        {[
          { label: "SATELLITES", value: satellites.length, color: "#4fc3f7" },
          { label: "DÉCISIONS TOTAL", value: decisions.length, color: "#ab47bc" },
          { label: "MANŒUVRES", value: decisions.filter(d => d.decision === "maneuver").length, color: "#ff4444" },
        ].map((stat) => (
          <div key={stat.label} style={{
            background: "#111827", border: "1px solid #1e293b",
            borderRadius: "12px", padding: "20px", textAlign: "center"
          }}>
            <div style={{ fontSize: "36px", fontWeight: "bold", color: stat.color }}>{stat.value}</div>
            <div style={{ fontSize: "11px", color: "#546e7a", marginTop: "4px", letterSpacing: "1px" }}>{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Decisions Table */}
      <div style={{ background: "#111827", border: "1px solid #1e293b", borderRadius: "12px", padding: "20px" }}>
        <h2 style={{ margin: "0 0 16px", fontSize: "14px", color: "#4fc3f7", letterSpacing: "1px" }}>
          📋 HISTORIQUE DES DÉCISIONS COLA
        </h2>
        {loading ? (
          <div style={{ color: "#546e7a", textAlign: "center", padding: "40px" }}>Chargement...</div>
        ) : decisions.length === 0 ? (
          <div style={{ color: "#546e7a", textAlign: "center", padding: "40px" }}>Aucune décision enregistrée</div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
            <thead>
              <tr style={{ color: "#546e7a", borderBottom: "1px solid #1e293b" }}>
                {["ID", "PRIMAIRE", "SECONDAIRE", "Pc", "DISTANCE", "TCA", "DÉCISION", "CONFIANCE", "DATE"].map(h => (
                  <th key={h} style={{ padding: "8px 12px", textAlign: "left", fontWeight: "normal", letterSpacing: "1px", fontSize: "11px" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {decisions.map((d) => (
                <tr key={d.id} style={{ borderBottom: "1px solid #1e293b" }}>
                  <td style={{ padding: "10px 12px", color: "#546e7a" }}>#{d.id}</td>
                  <td style={{ padding: "10px 12px" }}>{d.norad_id_primary}</td>
                  <td style={{ padding: "10px 12px" }}>{d.norad_id_secondary}</td>
                  <td style={{ padding: "10px 12px", color: d.pc > 1e-4 ? "#ff4444" : "#00cc66" }}>{d.pc.toExponential(2)}</td>
                  <td style={{ padding: "10px 12px" }}>{d.miss_distance_m}m</td>
                  <td style={{ padding: "10px 12px" }}>{d.tca_hours}h</td>
                  <td style={{ padding: "10px 12px" }}>
                    <span style={{
                      background: statusColor(d.decision) + "22",
                      color: statusColor(d.decision),
                      border: `1px solid ${statusColor(d.decision)}`,
                      borderRadius: "4px", padding: "2px 8px", fontSize: "11px", fontWeight: "bold"
                    }}>
                      {d.decision.toUpperCase()}
                    </span>
                  </td>
                  <td style={{ padding: "10px 12px", color: "#ab47bc" }}>{(d.confidence * 100).toFixed(0)}%</td>
                  <td style={{ padding: "10px 12px", color: "#546e7a", fontSize: "11px" }}>
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
