import { useState, useEffect } from "react";
import axios from "axios";
import OrbitalView from "./OrbitalView";
import RiskChart from "./RiskChart";
import MLPredictionPanel from "./MLPredictionPanel";
import ManeuverTimeline from "./ManeuverTimeline";
import StatusBar from "./StatusBar";

const API_URL = "https://focus-api-vg34.onrender.com";
const API_KEY = "focus-dev-key-2026";
const H = { "X-API-Key": API_KEY };

const DEFAULT_CDM = {
  norad_id_primary: 25544, norad_id_secondary: 48274,
  tca_hours: 12.5, miss_distance_m: 150, pc: 0.0003,
  dv_available_ms: 2.5, cdm_reliability: 0.85,
};

const LABELS = {
  norad_id_primary: "NORAD PRIMARY", norad_id_secondary: "NORAD SECONDARY",
  tca_hours: "TCA (hours)", miss_distance_m: "MISS DIST (m)",
  pc: "Pc", dv_available_ms: "DV AVAIL (m/s)", cdm_reliability: "CDM RELIABILITY",
};

const DECISION_STYLE = {
  maneuver: { color: "var(--red)",   glow: "var(--red-glow)",   label: "MANEUVER" },
  replan:   { color: "var(--amber)", glow: "var(--amber-glow)", label: "REPLAN"   },
  wait:     { color: "var(--green)", glow: "var(--green-glow)", label: "WAIT"     },
};

function Badge({ decision }) {
  const s = DECISION_STYLE[decision] || { color: "var(--text-2)", glow: "transparent", label: decision?.toUpperCase() };
  return (
    <span style={{ fontFamily: "var(--mono)", fontSize: 10, fontWeight: 500, letterSpacing: "0.08em", color: s.color, background: s.glow, border: "1px solid " + s.color + "40", borderRadius: 4, padding: "2px 8px", whiteSpace: "nowrap" }}>
      {s.label}
    </span>
  );
}

function Card({ children, style = {} }) {
  return (
    <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "var(--radius)", boxShadow: "0 4px 24px rgba(0,0,0,0.3)", ...style }}>
      {children}
    </div>
  );
}

function KpiCard({ label, value, unit, color, sub }) {
  return (
    <Card style={{ padding: "20px 24px", position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", top: 0, right: 0, width: 80, height: 80, background: "radial-gradient(circle at top right, " + color + "18, transparent 70%)", borderRadius: "0 var(--radius) 0 0" }} />
      <div style={{ fontSize: 10, color: "var(--text-2)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 10 }}>{label}</div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
        <span style={{ fontFamily: "var(--mono)", fontSize: 32, fontWeight: 500, color, lineHeight: 1 }}>{value}</span>
        {unit && <span style={{ fontFamily: "var(--mono)", fontSize: 13, color: "var(--text-2)" }}>{unit}</span>}
      </div>
      {sub && <div style={{ fontSize: 10, color: "var(--text-3)", marginTop: 6 }}>{sub}</div>}
    </Card>
  );
}

function SectionTitle({ children, accentColor = "var(--blue)" }) {
  return (
    <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--text-2)", marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
      <div style={{ width: 3, height: 12, background: accentColor, borderRadius: 2 }} />
      {children}
    </div>
  );
}

export default function App() {
  const [decisions, setDecisions] = useState([]);
  const [satellites, setSatellites] = useState([]);
  const [tleData, setTleData] = useState({});
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [cdm, setCdm] = useState(DEFAULT_CDM);
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [tick, setTick] = useState(new Date());
  const [mlReady, setMlReady] = useState(false);
  const [activeTab, setActiveTab] = useState("operations");

  const pull = async () => {
    try {
      const [d, s, h] = await Promise.all([
        axios.get(API_URL + "/v1/decisions", { headers: H }),
        axios.get(API_URL + "/v1/satellites", { headers: H }),
        axios.get(API_URL + "/v1/health"),
      ]);
      setDecisions(d.data); setSatellites(s.data); setHealth(h.data);
    } catch { setHealth(null); }
    finally { setLoading(false); setTick(new Date()); }
  };

  useEffect(() => { pull(); const t = setInterval(pull, 15000); return () => clearInterval(t); }, []);

  useEffect(() => {
    const fetchTles = async () => {
      try {
        const s = await axios.get(API_URL + "/v1/satellites", { headers: H });
        const tles = {};
        await Promise.all(s.data.map(async sat => {
          try { const t = await axios.get(API_URL + "/v1/tle/" + sat.norad_id, { headers: H }); tles[sat.norad_id] = t.data; } catch {}
        }));
        setTleData(tles);
      } catch {}
    };
    fetchTles();
  }, []);

  // Check ML engine
  useEffect(() => {
    axios.get(API_URL + '/v1/health')
      .then(() => setMlReady(true)).catch(() => {});
  }, []);

  useEffect(() => {
    if (satellites.length === 0) return;
    axios.get(API_URL + "/v1/predict-ml/" + satellites[0]?.norad_id, { headers: H })
      .then(() => setMlReady(true)).catch(() => setMlReady(false));
  }, [satellites]);

  const submit = async () => {
    setBusy(true); setResult(null);
    try {
      const r = await axios.post(API_URL + "/v1/decide", cdm, { headers: H });
      setResult(r.data); setTimeout(pull, 800);
    } catch { setResult({ error: true }); }
    finally { setBusy(false); }
  };

  const maneuvers = decisions.filter(d => d.decision === "maneuver").length;
  const avgConf = decisions.length ? (decisions.reduce((s, d) => s + d.confidence, 0) / decisions.length * 100).toFixed(1) : "—";
  const resultStyle = result && !result.error ? DECISION_STYLE[result.decision] : null;
  const TABS = [{ id: "operations", label: "Operations" }, { id: "ml", label: "ML Engine" }, { id: "timeline", label: "Maneuver Timeline" }];

  return (
    <div style={{ minHeight: "100vh", paddingBottom: 64 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 32px", height: 52, borderBottom: "1px solid var(--border)", background: "rgba(6,9,15,0.9)", backdropFilter: "blur(12px)", position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 32 }}>
          <span style={{ fontFamily: "var(--mono)", fontSize: 14, fontWeight: 500, color: "var(--blue-light)", letterSpacing: "0.2em" }}>FOCUS</span>
          <div style={{ width: 1, height: 20, background: "var(--border)" }} />
          <span style={{ fontSize: 11, color: "var(--text-2)", letterSpacing: "0.04em" }}>Space Collision Avoidance · Hybrid AND Engine</span>
          <div style={{ display: "flex", gap: 4 }}>
            {TABS.map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{ fontFamily: "var(--mono)", fontSize: 9, letterSpacing: "0.08em", padding: "5px 14px", borderRadius: 4, background: activeTab === tab.id ? "var(--blue)20" : "transparent", border: `1px solid ${activeTab === tab.id ? "var(--blue)" : "transparent"}`, color: activeTab === tab.id ? "var(--blue-light)" : "var(--text-3)", cursor: "pointer", transition: "all 0.15s" }}>
                {tab.label}
                {tab.id === "ml" && mlReady && <span style={{ marginLeft: 6, display: "inline-block", width: 5, height: 5, borderRadius: "50%", background: "var(--purple)", boxShadow: "0 0 4px var(--purple)", verticalAlign: "middle" }} />}
              </button>
            ))}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <span style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--text-3)" }}>{tick.toISOString().slice(0,19).replace("T"," ")} UTC</span>
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 12px", borderRadius: 6, background: health ? "var(--green-glow)" : "var(--red-glow)", border: "1px solid " + (health ? "var(--green)" : "var(--red)") + "40" }}>
            <div style={{ width: 7, height: 7, borderRadius: "50%", background: health ? "var(--green)" : "var(--red)", animation: health ? "pulse-dot 2.5s infinite" : "none" }} />
            <span style={{ fontFamily: "var(--mono)", fontSize: 10, fontWeight: 500, color: health ? "var(--green)" : "var(--red)", letterSpacing: "0.08em" }}>{health ? "NOMINAL" : "OFFLINE"}</span>
          </div>
        </div>
      </div>

      <StatusBar health={health} decisions={decisions} satellites={satellites} tleData={tleData} mlReady={mlReady} />

      <div style={{ maxWidth: 1440, margin: "0 auto", padding: "32px 32px 0" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 24 }}>
          <KpiCard label="Satellites Tracked" value={satellites.length} color="var(--blue-light)" />
          <KpiCard label="Total Decisions" value={decisions.length} color="var(--purple)" />
          <KpiCard label="Maneuvers Required" value={maneuvers} color="var(--red)" sub={decisions.length ? ((maneuvers/decisions.length)*100).toFixed(0)+"% of decisions" : ""} />
          <KpiCard label="Avg Confidence" value={avgConf} unit="%" color="var(--green)" />
        </div>

        <Card style={{ marginBottom: 24, overflow: "hidden" }}>
          <div style={{ padding: "14px 24px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <SectionTitle>Orbital View</SectionTitle>
            <span style={{ fontFamily: "var(--mono)", fontSize: 9, color: "var(--text-3)", letterSpacing: "0.08em" }}>DRAG TO ROTATE · REAL-TIME SIMULATION</span>
          </div>
          <div style={{ height: 320 }}><OrbitalView satellites={satellites} tleData={tleData} /></div>
        </Card>

        {activeTab === "operations" && (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "360px 1fr", gap: 20, marginBottom: 20 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <Card style={{ padding: 24 }}>
                  <SectionTitle>CDM Analysis</SectionTitle>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 16 }}>
                    {Object.entries(DEFAULT_CDM).map(([k]) => (
                      <div key={k}>
                        <label style={{ display: "block", fontSize: 9, color: "var(--text-3)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 5 }}>{LABELS[k]}</label>
                        <input type="number" step="any" value={cdm[k]} onChange={e => setCdm({ ...cdm, [k]: parseFloat(e.target.value) || 0 })} />
                      </div>
                    ))}
                  </div>
                  <button onClick={submit} disabled={busy} style={{ width: "100%", padding: "11px 0", borderRadius: 6, background: busy ? "var(--bg-2)" : "linear-gradient(135deg, var(--blue) 0%, #2563eb 100%)", color: busy ? "var(--text-3)" : "#fff", fontSize: 11, letterSpacing: "0.1em", fontWeight: 500, boxShadow: busy ? "none" : "0 4px 16px rgba(59,130,246,0.3)" }}>
                    {busy ? "PROCESSING..." : "RUN HYBRID AND ANALYSIS"}
                  </button>
                  {result && (
                    <div style={{ marginTop: 14, padding: 16, borderRadius: 8, background: result.error ? "var(--red-glow)" : resultStyle?.glow, border: "1px solid " + (result.error ? "var(--red)" : resultStyle?.color) + "33", animation: "fadein 0.25s ease" }}>
                      {result.error ? (
                        <p style={{ color: "var(--red)", fontFamily: "var(--mono)", fontSize: 11 }}>CONNECTION ERROR</p>
                      ) : (
                        <>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                            <Badge decision={result.decision} />
                            <span style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--text-2)" }}>{(result.confidence*100).toFixed(0)}% confidence</span>
                          </div>
                          <p style={{ fontSize: 11, color: "var(--text-2)", lineHeight: 1.65 }}>{result.reasoning}</p>
                          {result.recommended_dv_ms && <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid var(--border)", fontFamily: "var(--mono)", fontSize: 11, color: "var(--blue-light)" }}>DV recommended: {result.recommended_dv_ms} m/s</div>}
                        </>
                      )}
                    </div>
                  )}
                </Card>
                <Card style={{ padding: 24 }}>
                  <SectionTitle>Tracked Objects</SectionTitle>
                  {satellites.length === 0 ? (
                    <div style={{ fontSize: 11, color: "var(--text-3)", fontFamily: "var(--mono)", padding: "12px 0" }}>No objects registered</div>
                  ) : satellites.map(sat => (
                    <div key={sat.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid var(--border)" }}>
                      <div>
                        <div style={{ fontSize: 12, color: "var(--text)", fontWeight: 500 }}>{sat.name}</div>
                        <div style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--text-3)", marginTop: 2 }}>#{sat.norad_id} · {sat.altitude_km} km · {sat.inclination_deg}°</div>
                      </div>
                      <Badge decision={sat.status === "active" ? "wait" : "maneuver"} />
                    </div>
                  ))}
                </Card>
              </div>
              <Card style={{ overflow: "hidden" }}>
                <div style={{ padding: "16px 24px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <SectionTitle>Decision Log</SectionTitle>
                  <span style={{ fontSize: 10, color: "var(--text-3)", fontFamily: "var(--mono)" }}>{decisions.length} entries · auto-refresh 15s</span>
                </div>
                {loading ? (
                  <div style={{ padding: 32, fontFamily: "var(--mono)", fontSize: 11, color: "var(--text-3)" }}>Loading...</div>
                ) : decisions.length === 0 ? (
                  <div style={{ padding: 32, fontFamily: "var(--mono)", fontSize: 11, color: "var(--text-3)" }}>No decisions recorded — run your first analysis</div>
                ) : (
                  <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                      <thead>
                        <tr style={{ borderBottom: "1px solid var(--border)" }}>
                          {["ID","Primary","Secondary","Pc","Distance","TCA","Decision","Conf.","DV","Timestamp"].map(h => (
                            <th key={h} style={{ padding: "9px 16px", textAlign: "left", fontSize: 9, color: "var(--text-3)", letterSpacing: "0.1em", fontWeight: 600, textTransform: "uppercase", whiteSpace: "nowrap", background: "var(--bg-1)" }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {decisions.map((d, i) => (
                          <tr key={d.id} style={{ borderBottom: "1px solid var(--border)", background: i%2 ? "var(--bg-card)" : "transparent", transition: "background 0.1s" }}
                            onMouseEnter={e => e.currentTarget.style.background = "var(--bg-2)"}
                            onMouseLeave={e => e.currentTarget.style.background = i%2 ? "var(--bg-card)" : "transparent"}>
                            <td style={{ padding: "10px 16px", fontFamily: "var(--mono)", fontSize: 11, color: "var(--text-3)" }}>{d.id}</td>
                            <td style={{ padding: "10px 16px", fontFamily: "var(--mono)", fontSize: 11, color: "var(--blue-light)" }}>{d.norad_id_primary}</td>
                            <td style={{ padding: "10px 16px", fontFamily: "var(--mono)", fontSize: 11, color: "var(--text-2)" }}>{d.norad_id_secondary}</td>
                            <td style={{ padding: "10px 16px", fontFamily: "var(--mono)", fontSize: 11, color: d.pc > 1e-4 ? "var(--red)" : "var(--green)" }}>{d.pc.toExponential(2)}</td>
                            <td style={{ padding: "10px 16px", fontFamily: "var(--mono)", fontSize: 11, color: "var(--text-2)" }}>{d.miss_distance_m} m</td>
                            <td style={{ padding: "10px 16px", fontFamily: "var(--mono)", fontSize: 11, color: "var(--text-2)" }}>{d.tca_hours} h</td>
                            <td style={{ padding: "10px 16px" }}><Badge decision={d.decision} /></td>
                            <td style={{ padding: "10px 16px", fontFamily: "var(--mono)", fontSize: 11, color: "var(--purple)" }}>{(d.confidence*100).toFixed(0)}%</td>
                            <td style={{ padding: "10px 16px", fontFamily: "var(--mono)", fontSize: 11, color: "var(--blue-light)" }}>{d.recommended_dv_ms ? d.recommended_dv_ms+" m/s" : "—"}</td>
                            <td style={{ padding: "10px 16px", fontFamily: "var(--mono)", fontSize: 10, color: "var(--text-3)", whiteSpace: "nowrap" }}>{new Date(d.created_at).toISOString().slice(0,19).replace("T"," ")}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Card>
            </div>
            {satellites.length > 0 && (
              <Card style={{ marginBottom: 20, overflow: "hidden" }}>
                <div style={{ padding: "14px 24px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <SectionTitle>Digital Twin — Risk Timeline 24h</SectionTitle>
                  <span style={{ fontFamily: "var(--mono)", fontSize: 9, color: "var(--text-3)", letterSpacing: "0.08em" }}>SGP4 · SPACE-TRACK TLE</span>
                </div>
                <div style={{ height: 200, padding: "16px 8px 8px" }}>
                  <RiskChart noradId={satellites[0].norad_id} name={satellites[0].name} />
                </div>
              </Card>
            )}
          </>
        )}

        {activeTab === "ml" && (
          <Card style={{ marginBottom: 20, overflow: "hidden" }}>
            <MLPredictionPanel satellites={satellites} apiUrl={API_URL} headers={H} />
          </Card>
        )}

        {activeTab === "timeline" && (
          <Card style={{ marginBottom: 20, overflow: "hidden" }}>
            <ManeuverTimeline satellites={satellites} decisions={decisions} apiUrl={API_URL} headers={H} />
          </Card>
        )}

        <div style={{ paddingTop: 20, borderTop: "1px solid var(--border)", display: "flex", justifyContent: "space-between" }}>
          <span style={{ fontFamily: "var(--mono)", fontSize: 9, color: "var(--text-3)", letterSpacing: "0.08em" }}>FOCUS Space Technologies · ESA Kelvins Validated · 100% Recall · -38% False Alerts</span>
          <span style={{ fontFamily: "var(--mono)", fontSize: 9, color: "var(--text-3)", letterSpacing: "0.08em" }}>Contributions C3+C4 INPI · Hybrid AND Engine · {new Date().getFullYear()}</span>
        </div>
      </div>
    </div>
  );
}
