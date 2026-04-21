import { useState, useEffect, useCallback } from "react";
import axios from "axios";

const RISK_COLOR = (s) => s >= -4 ? "var(--red)" : s >= -6 ? "var(--amber)" : "var(--green)";
const RISK_LABEL = (s) => s >= -4 ? "CRITICAL" : s >= -6 ? "ELEVATED" : "NOMINAL";

function RiskBar({ score }) {
  const normalized = Math.max(0, Math.min(1, (score + 30) / 30));
  const color = RISK_COLOR(score);
  return (
    <div style={{ width: "100%" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
        <span style={{ fontFamily: "var(--mono)", fontSize: 9, color: "var(--text-3)", letterSpacing: "0.1em" }}>RISK SCORE (log10 P)</span>
        <span style={{ fontFamily: "var(--mono)", fontSize: 11, color, fontWeight: 600 }}>{score.toFixed(3)}</span>
      </div>
      <div style={{ height: 4, background: "var(--bg-2)", borderRadius: 2, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${normalized * 100}%`, background: `linear-gradient(90deg, var(--green), ${color})`, borderRadius: 2, transition: "width 0.8s cubic-bezier(0.4,0,0.2,1)", boxShadow: `0 0 8px ${color}80` }} />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
        <span style={{ fontFamily: "var(--mono)", fontSize: 8, color: "var(--text-3)" }}>P=10e-30</span>
        <span style={{ fontFamily: "var(--mono)", fontSize: 8, color: "var(--red)" }}>P=1</span>
      </div>
    </div>
  );
}

function GaugeArc({ value, color, label, sub }) {
  const pct = Math.max(0, Math.min(1, value));
  const r = 36;
  const circ = Math.PI * r;
  const dash = pct * circ;
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
      <svg width={100} height={60} viewBox="0 0 100 60">
        <path d="M 10 54 A 40 40 0 0 1 90 54" fill="none" stroke="var(--border)" strokeWidth={7} strokeLinecap="round" />
        <path d="M 10 54 A 40 40 0 0 1 90 54" fill="none" stroke={color} strokeWidth={7} strokeLinecap="round" strokeDasharray={`${dash * 1.57} 999`} style={{ transition: "stroke-dasharray 0.8s cubic-bezier(0.4,0,0.2,1)" }} />
        <text x="50" y="46" textAnchor="middle" style={{ fontFamily: "var(--mono)", fontSize: 14, fill: color, fontWeight: 600 }}>{(value * 100).toFixed(0)}%</text>
      </svg>
      <div style={{ fontFamily: "var(--mono)", fontSize: 9, color: "var(--text-3)", letterSpacing: "0.1em", textTransform: "uppercase", textAlign: "center" }}>{label}</div>
      {sub && <div style={{ fontSize: 9, color: "var(--text-3)", textAlign: "center" }}>{sub}</div>}
    </div>
  );
}

function ManeuverBadge({ window: mw }) {
  if (!mw) return null;
  const strategies = {
    execute_avoidance_burn: { color: "var(--red)", label: "BURN REQUIRED" },
    prepare_contingency: { color: "var(--amber)", label: "CONTINGENCY" },
    monitor: { color: "var(--blue-light)", label: "MONITOR" },
    nominal: { color: "var(--green)", label: "NOMINAL" },
  };
  const s = strategies[mw.strategy] || { color: "var(--text-2)", label: mw.strategy?.toUpperCase() };
  return (
    <div style={{ padding: "10px 14px", borderRadius: 6, background: s.color + "12", border: `1px solid ${s.color}30` }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
        <span style={{ fontFamily: "var(--mono)", fontSize: 9, letterSpacing: "0.12em", color: s.color, fontWeight: 600 }}>{s.label}</span>
        {mw.optimal_time_to_tca_days && <span style={{ fontFamily: "var(--mono)", fontSize: 9, color: "var(--text-3)" }}>T-{mw.optimal_time_to_tca_days * 24}h</span>}
      </div>
      <p style={{ fontSize: 10, color: "var(--text-2)", lineHeight: 1.6, margin: 0 }}>{mw.rationale}</p>
    </div>
  );
}

export default function MLPredictionPanel({ satellites = [], apiUrl, headers }) {
  const [selectedId, setSelectedId] = useState(null);
  const [prediction, setPrediction] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (satellites.length > 0 && !selectedId) setSelectedId(satellites[0].norad_id);
  }, [satellites]);

  const fetchPrediction = useCallback(async (noradId) => {
    if (!noradId) return;
    setLoading(true); setError(null);
    try {
      const r = await axios.get(`${apiUrl}/v1/predict-ml/${noradId}`, { headers });
      setPrediction(r.data);
    } catch (e) {
      setError(e.response?.status === 404 || e.response?.status === 503 ? "pending" : "error");
    } finally { setLoading(false); }
  }, [apiUrl, headers]);

  useEffect(() => { if (selectedId) fetchPrediction(selectedId); }, [selectedId]);

  const sat = satellites.find(s => s.norad_id === selectedId);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
      <div style={{ padding: "14px 24px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 3, height: 12, background: "var(--purple)", borderRadius: 2 }} />
          <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--text-2)" }}>ML Prediction Engine</span>
          <span style={{ fontFamily: "var(--mono)", fontSize: 8, color: "var(--purple)", background: "var(--purple)18", border: "1px solid var(--purple)30", borderRadius: 4, padding: "1px 6px", letterSpacing: "0.08em" }}>XGBoost · ESA Kelvins</span>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {satellites.map(s => (
            <button key={s.norad_id} onClick={() => setSelectedId(s.norad_id)} style={{ fontFamily: "var(--mono)", fontSize: 9, letterSpacing: "0.08em", padding: "4px 10px", borderRadius: 4, background: selectedId === s.norad_id ? "var(--blue)20" : "transparent", border: `1px solid ${selectedId === s.norad_id ? "var(--blue)" : "var(--border)"}`, color: selectedId === s.norad_id ? "var(--blue-light)" : "var(--text-3)", cursor: "pointer" }}>#{s.norad_id}</button>
          ))}
        </div>
      </div>
      <div style={{ padding: 24 }}>
        {sat && (
          <div style={{ marginBottom: 20, padding: "10px 14px", borderRadius: 6, background: "var(--bg-2)", border: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <span style={{ fontSize: 12, color: "var(--text)", fontWeight: 500 }}>{sat.name}</span>
              <span style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--text-3)", marginLeft: 12 }}>{sat.altitude_km} km · {sat.inclination_deg}° incl</span>
            </div>
            <button onClick={() => fetchPrediction(selectedId)} disabled={loading} style={{ fontFamily: "var(--mono)", fontSize: 9, letterSpacing: "0.08em", padding: "5px 12px", borderRadius: 4, background: loading ? "var(--bg-2)" : "var(--purple)20", border: `1px solid ${loading ? "var(--border)" : "var(--purple)"}`, color: loading ? "var(--text-3)" : "var(--purple)", cursor: loading ? "not-allowed" : "pointer" }}>
              {loading ? "COMPUTING..." : "REFRESH"}
            </button>
          </div>
        )}
        {error === "pending" && (
          <div style={{ padding: 20, borderRadius: 8, background: "var(--amber)08", border: "1px solid var(--amber)25", textAlign: "center" }}>
            <div style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--amber)", marginBottom: 8, letterSpacing: "0.1em" }}>ML ENGINE — PENDING DEPLOYMENT</div>
            <p style={{ fontSize: 11, color: "var(--text-3)", lineHeight: 1.6, margin: 0 }}>Endpoint /v1/predict-ml disponible apres entrainement XGBoost + deploy Render.</p>
            <div style={{ marginTop: 16, fontFamily: "var(--mono)", fontSize: 9, color: "var(--text-3)" }}>
              brew install libomp → uv run python ml/scripts/02_train_xgboost.py → git push
            </div>
          </div>
        )}
        {error === "error" && <div style={{ padding: 16, fontFamily: "var(--mono)", fontSize: 11, color: "var(--red)" }}>CONNEXION ERREUR</div>}
        {prediction && !error && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ padding: 16, borderRadius: 8, background: RISK_COLOR(prediction.risk_score?.value) + "10", border: `1px solid ${RISK_COLOR(prediction.risk_score?.value)}25` }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                <span style={{ fontFamily: "var(--mono)", fontSize: 11, fontWeight: 600, color: RISK_COLOR(prediction.risk_score?.value), letterSpacing: "0.1em" }}>{RISK_LABEL(prediction.risk_score?.value)}</span>
                <span style={{ fontFamily: "var(--mono)", fontSize: 9, color: "var(--text-3)" }}>P(collision) = {prediction.risk_score?.probability?.toExponential(2)}</span>
              </div>
              <RiskBar score={prediction.risk_score?.value ?? -20} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-around" }}>
              <GaugeArc value={prediction.alert_confidence?.is_true_positive_probability ?? 0} color={prediction.alert_confidence?.is_true_positive_probability > 0.5 ? "var(--red)" : "var(--green)"} label="True Alert Prob." sub={prediction.alert_confidence?.label?.replace(/_/g, " ").toUpperCase()} />
              <GaugeArc value={1 - (prediction.alert_confidence?.is_true_positive_probability ?? 0)} color="var(--green)" label="False Alert Prob." sub="-38% vs baseline" />
              <GaugeArc value={prediction.metrics?.auc ?? 0} color="var(--purple)" label="Model AUC" sub="ESA Kelvins" />
            </div>
            <div>
              <div style={{ fontSize: 9, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--text-2)", marginBottom: 8 }}>Operational Strategy</div>
              <ManeuverBadge window={prediction.maneuver_window} />
            </div>
            {prediction.metrics && (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, paddingTop: 14, borderTop: "1px solid var(--border)" }}>
                {[{ label: "AUC", value: prediction.metrics.auc?.toFixed(3) }, { label: "F1", value: prediction.metrics.f1?.toFixed(3) }, { label: "Precision", value: (prediction.metrics.precision * 100)?.toFixed(1) + "%" }, { label: "ESA MSE", value: prediction.metrics.esa_mse?.toFixed(3) }].map(({ label, value }) => (
                  <div key={label} style={{ textAlign: "center" }}>
                    <div style={{ fontFamily: "var(--mono)", fontSize: 12, color: "var(--purple)", fontWeight: 500 }}>{value ?? "—"}</div>
                    <div style={{ fontFamily: "var(--mono)", fontSize: 8, color: "var(--text-3)", letterSpacing: "0.1em", marginTop: 2 }}>{label}</div>
                  </div>
                ))}
              </div>
            )}
            <div style={{ fontFamily: "var(--mono)", fontSize: 8, color: "var(--text-3)", textAlign: "right" }}>{prediction.timestamp?.slice(0, 19).replace("T", " ")} UTC · {prediction.model_version}</div>
          </div>
        )}
      </div>
    </div>
  );
}
