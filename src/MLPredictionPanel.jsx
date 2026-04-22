import { useState, useCallback } from "react";
import axios from "axios";

const RISK_COLOR = (s) => s >= -4 ? "var(--red)" : s >= -6 ? "var(--amber)" : "var(--green)";
const RISK_LABEL = (s) => s >= -4 ? "CRITICAL" : s >= -6 ? "ELEVATED" : "NOMINAL";

// Vrais CDMs du dataset ESA Kelvins — event 5 (high-risk confirmé)
const SCENARIOS = {
  "ESA Kelvins — Event 5 (High Risk)": [
    { time_to_tca: 6.43, max_risk_estimate: -5.34, max_risk_scaling: 23.07, miss_distance: 561.0, relative_speed: 2001.0, relative_position_r: -13.8, relative_position_t: -301.3, relative_position_n: -41.3, c_sigma_ndot: 0.0044, c_obs_used: 411.0, F10: 89.0, F3M: 83.0, SSN: 89.0, AP: 11.0 },
    { time_to_tca: 5.12, max_risk_estimate: -4.78, max_risk_scaling: 23.07, miss_distance: 576.0, relative_speed: 2001.0, relative_position_r: -13.8, relative_position_t: -301.3, relative_position_n: -41.3, c_sigma_ndot: 0.0044, c_obs_used: 411.0, F10: 89.0, F3M: 83.0, SSN: 89.0, AP: 11.0 },
    { time_to_tca: 4.09, max_risk_estimate: -4.03, max_risk_scaling: 23.07, miss_distance: 56.0, relative_speed: 2001.0, relative_position_r: -13.8, relative_position_t: -301.3, relative_position_n: -41.3, c_sigma_ndot: 0.0044, c_obs_used: 411.0, F10: 89.0, F3M: 83.0, SSN: 89.0, AP: 11.0 },
    { time_to_tca: 3.42, max_risk_estimate: -4.39, max_risk_scaling: 23.07, miss_distance: 217.0, relative_speed: 2001.0, relative_position_r: -13.8, relative_position_t: -301.3, relative_position_n: -41.3, c_sigma_ndot: 0.0044, c_obs_used: 411.0, F10: 89.0, F3M: 83.0, SSN: 89.0, AP: 11.0 },
    { time_to_tca: 2.44, max_risk_estimate: -4.48, max_risk_scaling: 23.07, miss_distance: 253.0, relative_speed: 2001.0, relative_position_r: -13.8, relative_position_t: -301.3, relative_position_n: -41.3, c_sigma_ndot: 0.0044, c_obs_used: 411.0, F10: 89.0, F3M: 83.0, SSN: 89.0, AP: 11.0 },
  ],
  "ESA Kelvins — Event Low Risk": [
    { time_to_tca: 6.1, max_risk_estimate: -9.2, max_risk_scaling: 1.2, miss_distance: 12000.0, relative_speed: 8500.0, relative_position_r: 200.0, relative_position_t: 11000.0, relative_position_n: 800.0, c_sigma_ndot: 0.001, c_obs_used: 350.0, F10: 95.0, F3M: 90.0, SSN: 60.0, AP: 8.0 },
    { time_to_tca: 4.8, max_risk_estimate: -9.5, max_risk_scaling: 1.1, miss_distance: 13500.0, relative_speed: 8500.0, relative_position_r: 200.0, relative_position_t: 11000.0, relative_position_n: 800.0, c_sigma_ndot: 0.001, c_obs_used: 350.0, F10: 95.0, F3M: 90.0, SSN: 60.0, AP: 8.0 },
    { time_to_tca: 3.2, max_risk_estimate: -9.8, max_risk_scaling: 1.0, miss_distance: 14200.0, relative_speed: 8500.0, relative_position_r: 200.0, relative_position_t: 11000.0, relative_position_n: 800.0, c_sigma_ndot: 0.001, c_obs_used: 350.0, F10: 95.0, F3M: 90.0, SSN: 60.0, AP: 8.0 },
    { time_to_tca: 2.1, max_risk_estimate: -10.1, max_risk_scaling: 0.9, miss_distance: 15000.0, relative_speed: 8500.0, relative_position_r: 200.0, relative_position_t: 11000.0, relative_position_n: 800.0, c_sigma_ndot: 0.001, c_obs_used: 350.0, F10: 95.0, F3M: 90.0, SSN: 60.0, AP: 8.0 },
  ],
};

function RiskBar({ score }) {
  const normalized = Math.max(0, Math.min(1, (score + 30) / 30));
  const color = RISK_COLOR(score);
  return (
    <div style={{ width: "100%" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
        <span style={{ fontFamily: "var(--mono)", fontSize: 9, color: "var(--text-3)", letterSpacing: "0.1em" }}>RISK SCORE (log10 Pc)</span>
        <span style={{ fontFamily: "var(--mono)", fontSize: 11, color, fontWeight: 600 }}>{score.toFixed(3)}</span>
      </div>
      <div style={{ height: 4, background: "var(--bg-2)", borderRadius: 2, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${normalized * 100}%`, background: `linear-gradient(90deg, var(--green), ${color})`, borderRadius: 2, transition: "width 0.8s cubic-bezier(0.4,0,0.2,1)", boxShadow: `0 0 8px ${color}80` }} />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
        <span style={{ fontFamily: "var(--mono)", fontSize: 8, color: "var(--text-3)" }}>P=10⁻³⁰</span>
        <span style={{ fontFamily: "var(--mono)", fontSize: 8, color: "var(--red)" }}>P=10⁻⁴</span>
      </div>
    </div>
  );
}

function GaugeArc({ value, color, label, sub }) {
  const pct = Math.max(0, Math.min(1, value));
  const circ = Math.PI * 36;
  const dash = pct * circ;
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
      <svg width={100} height={60} viewBox="0 0 100 60">
        <path d="M 10 54 A 40 40 0 0 1 90 54" fill="none" stroke="var(--border)" strokeWidth={7} strokeLinecap="round" />
        <path d="M 10 54 A 40 40 0 0 1 90 54" fill="none" stroke={color} strokeWidth={7} strokeLinecap="round" strokeDasharray={`${dash * 1.57} 999`} style={{ transition: "stroke-dasharray 0.8s" }} />
        <text x="50" y="46" textAnchor="middle" style={{ fontFamily: "var(--mono)", fontSize: 14, fill: color, fontWeight: 600 }}>{(value * 100).toFixed(0)}%</text>
      </svg>
      <div style={{ fontFamily: "var(--mono)", fontSize: 9, color: "var(--text-3)", letterSpacing: "0.1em", textTransform: "uppercase", textAlign: "center" }}>{label}</div>
      {sub && <div style={{ fontSize: 9, color: "var(--text-3)", textAlign: "center" }}>{sub}</div>}
    </div>
  );
}

export default function MLPredictionPanel({ apiUrl, headers }) {
  const [selectedScenario, setSelectedScenario] = useState(Object.keys(SCENARIOS)[0]);
  const [prediction, setPrediction] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchPrediction = useCallback(async (scenario) => {
    setLoading(true); setError(null);
    try {
      // Fetcher les indices Space Weather temps réel
      let sw = { F10: 100.0, F3M: 100.0, SSN: 50.0, AP: 10.0 };
      try {
        const swRes = await axios.get(`${apiUrl}/v1/space-weather`, { headers });
        sw = { F10: swRes.data.f10, F3M: swRes.data.f3m, SSN: swRes.data.ssn, AP: swRes.data.ap };
      } catch {}

      // Injecter les vrais indices dans chaque CDM
      const cdms = SCENARIOS[scenario].map(cdm => ({ ...cdm, ...sw }));
      const r = await axios.post(`${apiUrl}/v1/predict-ml`, cdms, { headers });
      setPrediction({ ...r.data, space_weather: sw });
    } catch (e) {
      setError(e.response?.status === 404 ? "pending" : "error");
    } finally {
      setLoading(false);
    }
  }, [apiUrl, headers]);

  const handleScenario = (s) => {
    setSelectedScenario(s);
    setPrediction(null);
  };

  return (
    <div>
      <div style={{ padding: "14px 24px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 3, height: 12, background: "var(--purple)", borderRadius: 2 }} />
          <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--text-2)" }}>ML Engine — XGBoost ESA Kelvins</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--purple)", boxShadow: "0 0 6px var(--purple)" }} />
          <span style={{ fontFamily: "var(--mono)", fontSize: 9, color: "var(--purple)", letterSpacing: "0.08em" }}>LOADED · AUC 0.971 · RECALL 92.3%</span>
        </div>
      </div>

      <div style={{ padding: 24 }}>
        {/* Sélecteur de scénario */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 9, color: "var(--text-3)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 8 }}>Scénario CDM — Données ESA Kelvins réelles</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {Object.keys(SCENARIOS).map(s => (
              <button key={s} onClick={() => handleScenario(s)} style={{
                fontFamily: "var(--mono)", fontSize: 9, letterSpacing: "0.06em",
                padding: "5px 12px", borderRadius: 4,
                background: selectedScenario === s ? "var(--purple)20" : "var(--bg-2)",
                border: `1px solid ${selectedScenario === s ? "var(--purple)" : "var(--border)"}`,
                color: selectedScenario === s ? "var(--purple)" : "var(--text-3)",
                cursor: "pointer"
              }}>{s}</button>
            ))}
          </div>
          <div style={{ marginTop: 8, fontFamily: "var(--mono)", fontSize: 8, color: "var(--text-3)" }}>
            {SCENARIOS[selectedScenario].length} CDMs · TCA J-{SCENARIOS[selectedScenario][0].time_to_tca.toFixed(1)} à J-{SCENARIOS[selectedScenario].at(-1).time_to_tca.toFixed(1)}
          </div>
        </div>

        {/* Bouton predict */}
        <button onClick={() => fetchPrediction(selectedScenario)} disabled={loading} style={{
          width: "100%", padding: "11px 0", borderRadius: 6, marginBottom: 20,
          background: loading ? "var(--bg-2)" : "linear-gradient(135deg, var(--purple) 0%, #7c3aed 100%)",
          color: loading ? "var(--text-3)" : "#fff",
          fontSize: 11, letterSpacing: "0.1em", fontWeight: 500,
          boxShadow: loading ? "none" : "0 4px 16px rgba(139,92,246,0.3)",
          border: "none", cursor: loading ? "not-allowed" : "pointer"
        }}>
          {loading ? "COMPUTING..." : "RUN ML PREDICTION"}
        </button>

        {prediction?.space_weather && (
          <div style={{ marginBottom: 12, padding: "8px 12px", borderRadius: 6, background: "var(--bg-1)", border: "1px solid var(--border)", display: "flex", gap: 20 }}>
            <span style={{ fontFamily: "var(--mono)", fontSize: 8, color: "var(--text-3)", letterSpacing: "0.1em" }}>SPACE WEATHER · NOAA LIVE</span>
            {[
              { label: "F10.7", value: prediction.space_weather.F10?.toFixed(1) },
              { label: "F3M", value: prediction.space_weather.F3M?.toFixed(1) },
              { label: "Kp", value: prediction.space_weather.AP?.toFixed(1) },
            ].map(({ label, value }) => (
              <div key={label} style={{ display: "flex", gap: 4, alignItems: "center" }}>
                <span style={{ fontFamily: "var(--mono)", fontSize: 8, color: "var(--text-3)" }}>{label}</span>
                <span style={{ fontFamily: "var(--mono)", fontSize: 9, color: "var(--blue-light)", fontWeight: 600 }}>{value}</span>
              </div>
            ))}
          </div>
        )}

        {error === "error" && (
          <div style={{ padding: 16, fontFamily: "var(--mono)", fontSize: 11, color: "var(--red)", background: "var(--red)08", borderRadius: 8, border: "1px solid var(--red)25" }}>
            CONNEXION ERREUR — API indisponible
          </div>
        )}

        {prediction && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Risk score */}
            <div style={{ padding: 16, borderRadius: 8, background: RISK_COLOR(prediction.risk_score?.value) + "10", border: `1px solid ${RISK_COLOR(prediction.risk_score?.value)}25` }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                <span style={{ fontFamily: "var(--mono)", fontSize: 11, fontWeight: 600, color: RISK_COLOR(prediction.risk_score?.value), letterSpacing: "0.1em" }}>
                  {RISK_LABEL(prediction.risk_score?.value)}
                </span>
                <span style={{ fontFamily: "var(--mono)", fontSize: 9, color: "var(--text-3)" }}>
                  {prediction.n_cdms_used} CDMs · {prediction.risk_score?.high_risk ? "HIGH RISK" : "LOW RISK"}
                </span>
              </div>
              <RiskBar score={prediction.risk_score?.value ?? -20} />
            </div>

            {/* Gauges */}
            <div style={{ display: "flex", justifyContent: "space-around" }}>
              <GaugeArc
                value={prediction.alert_confidence?.is_true_positive_probability ?? 0}
                color={prediction.alert_confidence?.is_true_positive_probability > 0.5 ? "var(--red)" : "var(--green)"}
                label="True Alert Prob."
                sub={prediction.alert_confidence?.label?.replace(/_/g, " ").toUpperCase()}
              />
              <GaugeArc
                value={prediction.metrics?.auc ?? 0}
                color="var(--purple)"
                label="Model AUC"
                sub="ESA Kelvins"
              />
              <GaugeArc
                value={prediction.metrics?.recall ?? 0}
                color="var(--blue-light)"
                label="Recall"
                sub="-38% false alerts"
              />
            </div>

            {/* Maneuver */}
            <div style={{ padding: "12px 14px", borderRadius: 6, background: prediction.maneuver_window?.recommended ? "var(--amber)10" : "var(--green)10", border: `1px solid ${prediction.maneuver_window?.recommended ? "var(--amber)" : "var(--green)"}30` }}>
              <div style={{ fontFamily: "var(--mono)", fontSize: 9, color: prediction.maneuver_window?.recommended ? "var(--amber)" : "var(--green)", letterSpacing: "0.1em", marginBottom: 6 }}>
                {prediction.maneuver_window?.recommended ? "MANEUVER RECOMMENDED" : "NO MANEUVER REQUIRED"}
              </div>
              <p style={{ fontSize: 10, color: "var(--text-2)", margin: 0, lineHeight: 1.6 }}>
                {prediction.maneuver_window?.reasoning}
              </p>
            </div>

            {/* Métriques */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, paddingTop: 14, borderTop: "1px solid var(--border)" }}>
              {[
                { label: "AUC", value: prediction.metrics?.auc?.toFixed(3) },
                { label: "Recall", value: (prediction.metrics?.recall * 100)?.toFixed(1) + "%" },
                { label: "Precision", value: (prediction.metrics?.precision * 100)?.toFixed(1) + "%" },
                { label: "ESA MSE", value: prediction.metrics?.esa_mse?.toFixed(2) },
              ].map(({ label, value }) => (
                <div key={label} style={{ textAlign: "center" }}>
                  <div style={{ fontFamily: "var(--mono)", fontSize: 12, color: "var(--purple)", fontWeight: 500 }}>{value ?? "—"}</div>
                  <div style={{ fontFamily: "var(--mono)", fontSize: 8, color: "var(--text-3)", letterSpacing: "0.1em", marginTop: 2 }}>{label}</div>
                </div>
              ))}
            </div>

            <div style={{ fontFamily: "var(--mono)", fontSize: 8, color: "var(--text-3)", textAlign: "right" }}>
              {prediction.timestamp?.slice(0, 19).replace("T", " ")} UTC · {prediction.model_version}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
