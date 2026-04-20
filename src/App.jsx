import { useState, useEffect } from "react";
import axios from "axios";

const API_URL = "https://focus-api-vg34.onrender.com";
const API_KEY = "focus-dev-key-2026";
const H = { "X-API-Key": API_KEY };

const DEFAULT_CDM = {
  norad_id_primary: 25544,
  norad_id_secondary: 48274,
  tca_hours: 12.5,
  miss_distance_m: 150,
  pc: 0.0003,
  dv_available_ms: 2.5,
  cdm_reliability: 0.85,
};

const LABELS = {
  norad_id_primary: "NORAD PRIMARY",
  norad_id_secondary: "NORAD SECONDARY",
  tca_hours: "TCA (hours)",
  miss_distance_m: "MISS DIST (m)",
  pc: "Pc",
  dv_available_ms: "ΔV AVAIL (m/s)",
  cdm_reliability: "CDM RELIABILITY",
};

const STATUS = {
  maneuver: { color: "var(--red)", bg: "var(--red-dim)", label: "MANEUVER" },
  replan:   { color: "var(--amber)", bg: "var(--amber-dim)", label: "REPLAN" },
  wait:     { color: "var(--green)", bg: "var(--green-dim)", label: "WAIT" },
};

function Tag({ v }) {
  const s = STATUS[v] || { color: "var(--text-2)", bg: "var(--bg-3)", label: v?.toUpperCase() };
  return (
    <span style={{
      fontFamily: "var(--mono)", fontSize: 10, letterSpacing: "0.1em",
      color: s.color, background: s.bg,
      padding: "2px 8px", border: `1px solid ${s.color}55`,
    }}>
      {s.label}
    </span>
  );
}

function Kpi({ label, value, unit, accent }) {
  return (
    <div style={{
      borderLeft: `2px solid ${accent || "var(--line-bright)"}`,
      padding: "12px 16px", background: "var(--bg-1)",
      borderTop: "1px solid var(--line)", borderRight: "1px solid var(--line)", borderBottom: "1px solid var(--line)",
    }}>
      <div style={{ fontFamily: "var(--mono)", fontSize: 9, color: "var(--text-3)", letterSpacing: "0.12em", marginBottom: 6 }}>{label}</div>
      <div style={{ fontFamily: "var(--mono)", fontSize: 26, color: accent || "var(--text)", fontWeight: 500, lineHeight: 1 }}>
        {value}<span style={{ fontSize: 11, color: "var(--text-2)", marginLeft: 4 }}>{unit}</span>
      </div>
    </div>
  );
}

function SectionHeader({ title, sub }) {
  return (
    <div style={{
      borderBottom: "1px solid var(--line)", padding: "8px 16px",
      background: "var(--bg-1)", display: "flex", alignItems: "baseline", gap: 12
    }}>
      <span style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--text-2)", letterSpacing: "0.12em" }}>{title}</span>
      {sub && <span style={{ fontSize: 10, color: "var(--text-3)" }}>{sub}</span>}
    </div>
  );
}

export default function App() {
  const [decisions, setDecisions] = useState([]);
  const [satellites, setSatellites] = useState([]);
  const [health, setHealth]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [cdm, setCdm]         = useState(DEFAULT_CDM);
  const [result, setResult]   = useState(null);
  const [busy, setBusy]       = useState(false);
  const [tick, setTick]       = useState(new Date());

  const pull = async () => {
    try {
      const [d, s, h] = await Promise.all([
        axios.get(`${API_URL}/v1/decisions`, { headers: H }),
        axios.get(`${API_URL}/v1/satellites`, { headers: H }),
        axios.get(`${API_URL}/v1/health`),
      ]);
      setDecisions(d.data); setSatellites(s.data); setHealth(h.data);
    } catch { setHealth(null); }
    finally { setLoading(false); setTick(new Date()); }
  };

  useEffect(() => { pull(); const t = setInterval(pull, 15000); return () => clearInterval(t); }, []);

  const submit = async () => {
    setBusy(true); setResult(null);
    try {
      const r = await axios.post(`${API_URL}/v1/decide`, cdm, { headers: H });
      setResult(r.data); setTimeout(pull, 800);
    } catch { setResult({ error: true }); }
    finally { setBusy(false); }
  };

  const maneuvers = decisions.filter(d => d.decision === "maneuver").length;
  const avgConf   = decisions.length
    ? (decisions.reduce((s, d) => s + d.confidence, 0) / decisions.length * 100).toFixed(1)
    : "—";

  return (
    <div style={{ maxWidth: 1400, margin: "0 auto", padding: "0 0 48px" }}>

      {/* ── Top bar ── */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 24px", height: 48,
        borderBottom: "1px solid var(--line)", background: "var(--bg-1)",
        position: "sticky", top: 0, zIndex: 10,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <span style={{ fontFamily: "var(--mono)", fontSize: 13, color: "var(--text)", letterSpacing: "0.15em", fontWeight: 500 }}>
            FOCUS
          </span>
          <span style={{ fontSize: 10, color: "var(--text-3)", letterSpacing: "0.08em" }}>
            SPACE COLLISION AVOIDANCE · HYBRID AND C3+C4
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <span style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--text-3)" }}>
            {tick.toISOString().replace("T", " ").slice(0, 19)} UTC
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{
              width: 6, height: 6, borderRadius: "50%",
              background: health ? "var(--green)" : "var(--red)",
              animation: health ? "blink 3s infinite" : "none",
            }} />
            <span style={{ fontFamily: "var(--mono)", fontSize: 10, color: health ? "var(--green)" : "var(--red)" }}>
              {health ? "NOMINAL" : "OFFLINE"}
            </span>
          </div>
        </div>
      </div>

      {/* ── KPIs ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 1, margin: "1px 0", background: "var(--line)" }}>
        <Kpi label="SATELLITES TRACKED" value={satellites.length} accent="var(--accent)" />
        <Kpi label="TOTAL DECISIONS"     value={decisions.length} accent="var(--text-2)" />
        <Kpi label="MANEUVER REQUIRED"   value={maneuvers} accent="var(--red)" />
        <Kpi label="AVG CONFIDENCE"      value={avgConf} unit="%" accent="var(--green)" />
      </div>

      {/* ── Main grid ── */}
      <div style={{ display: "grid", gridTemplateColumns: "380px 1fr", gap: 1, marginTop: 1, background: "var(--line)" }}>

        {/* CDM Panel */}
        <div style={{ background: "var(--bg)", display: "flex", flexDirection: "column" }}>
          <SectionHeader title="CDM INPUT" sub="Conjunction Data Message" />
          <div style={{ padding: 16, flex: 1 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1, background: "var(--line)", border: "1px solid var(--line)" }}>
              {Object.entries(DEFAULT_CDM).map(([k]) => (
                <div key={k} style={{ background: "var(--bg)", padding: "10px 12px" }}>
                  <div style={{ fontFamily: "var(--mono)", fontSize: 9, color: "var(--text-3)", letterSpacing: "0.1em", marginBottom: 4 }}>
                    {LABELS[k]}
                  </div>
                  <input
                    type="number" step="any" value={cdm[k]}
                    onChange={e => setCdm({ ...cdm, [k]: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              ))}
            </div>

            <button
              onClick={submit} disabled={busy}
              style={{
                marginTop: 12, width: "100%", padding: "10px 0",
                background: busy ? "var(--bg-3)" : "var(--accent)",
                color: busy ? "var(--text-3)" : "#fff",
                fontSize: 11, letterSpacing: "0.12em",
              }}
            >
              {busy ? "PROCESSING..." : "RUN HYBRID AND ANALYSIS"}
            </button>

            {result && (
              <div style={{
                marginTop: 12, padding: 14,
                border: `1px solid ${result.error ? "var(--red-dim)" : STATUS[result.decision]?.color + "44" || "var(--line)"}`,
                background: "var(--bg-1)", animation: "fadein 0.2s ease",
              }}>
                {result.error ? (
                  <div style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--red)" }}>API ERROR</div>
                ) : (
                  <>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                      <Tag v={result.decision} />
                      <span style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--text-2)" }}>
                        CONF {(result.confidence * 100).toFixed(0)}%
                      </span>
                    </div>
                    <div style={{ fontSize: 11, color: "var(--text-2)", lineHeight: 1.6, marginBottom: result.recommended_dv_ms ? 8 : 0 }}>
                      {result.reasoning}
                    </div>
                    {result.recommended_dv_ms && (
                      <div style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--accent)", marginTop: 8, paddingTop: 8, borderTop: "1px solid var(--line)" }}>
                        ΔV = {result.recommended_dv_ms} m/s
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>

          {/* Satellites */}
          <div style={{ borderTop: "1px solid var(--line)" }}>
            <SectionHeader title="TRACKED OBJECTS" sub={`${satellites.length} registered`} />
            <div style={{ padding: "8px 0" }}>
              {satellites.length === 0 ? (
                <div style={{ padding: "16px", fontSize: 11, color: "var(--text-3)", fontFamily: "var(--mono)" }}>
                  NO OBJECTS REGISTERED
                </div>
              ) : satellites.map(sat => (
                <div key={sat.id} style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  padding: "8px 16px", borderBottom: "1px solid var(--line)",
                }}>
                  <div>
                    <div style={{ fontSize: 12, color: "var(--text)", fontWeight: 500 }}>{sat.name}</div>
                    <div style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--text-3)", marginTop: 2 }}>
                      #{sat.norad_id} · {sat.altitude_km}km · {sat.inclination_deg}°inc
                    </div>
                  </div>
                  <Tag v={sat.status === "active" ? "wait" : "maneuver"} />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Decision log */}
        <div style={{ background: "var(--bg)", overflow: "hidden" }}>
          <SectionHeader title="DECISION LOG" sub={`${decisions.length} entries`} />
          {loading ? (
            <div style={{ padding: 24, fontFamily: "var(--mono)", fontSize: 11, color: "var(--text-3)" }}>
              LOADING...
            </div>
          ) : decisions.length === 0 ? (
            <div style={{ padding: 24, fontFamily: "var(--mono)", fontSize: 11, color: "var(--text-3)" }}>
              NO DECISIONS RECORDED — RUN FIRST ANALYSIS
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--line)", background: "var(--bg-1)" }}>
                    {["ID","PRIMARY","SECONDARY","Pc","DIST","TCA","DECISION","CONF","ΔV","TIMESTAMP"].map(h => (
                      <th key={h} style={{
                        padding: "7px 14px", textAlign: "left",
                        fontFamily: "var(--mono)", fontSize: 9, color: "var(--text-3)",
                        letterSpacing: "0.1em", fontWeight: 400, whiteSpace: "nowrap",
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {decisions.map((d, i) => (
                    <tr key={d.id} style={{
                      borderBottom: "1px solid var(--line)",
                      background: i % 2 ? "var(--bg-1)" : "var(--bg)",
                    }}
                      onMouseEnter={e => e.currentTarget.style.background = "var(--bg-3)"}
                      onMouseLeave={e => e.currentTarget.style.background = i % 2 ? "var(--bg-1)" : "var(--bg)"}
                    >
                      <td style={{ padding: "9px 14px", fontFamily: "var(--mono)", fontSize: 11, color: "var(--text-3)" }}>{d.id}</td>
                      <td style={{ padding: "9px 14px", fontFamily: "var(--mono)", fontSize: 11, color: "var(--accent)" }}>{d.norad_id_primary}</td>
                      <td style={{ padding: "9px 14px", fontFamily: "var(--mono)", fontSize: 11 }}>{d.norad_id_secondary}</td>
                      <td style={{ padding: "9px 14px", fontFamily: "var(--mono)", fontSize: 11, color: d.pc > 1e-4 ? "var(--red)" : "var(--green)" }}>
                        {d.pc.toExponential(2)}
                      </td>
                      <td style={{ padding: "9px 14px", fontFamily: "var(--mono)", fontSize: 11 }}>{d.miss_distance_m}m</td>
                      <td style={{ padding: "9px 14px", fontFamily: "var(--mono)", fontSize: 11 }}>{d.tca_hours}h</td>
                      <td style={{ padding: "9px 14px" }}><Tag v={d.decision} /></td>
                      <td style={{ padding: "9px 14px", fontFamily: "var(--mono)", fontSize: 11, color: "var(--text-2)" }}>
                        {(d.confidence * 100).toFixed(0)}%
                      </td>
                      <td style={{ padding: "9px 14px", fontFamily: "var(--mono)", fontSize: 11, color: "var(--accent)" }}>
                        {d.recommended_dv_ms ? `${d.recommended_dv_ms}` : "—"}
                      </td>
                      <td style={{ padding: "9px 14px", fontFamily: "var(--mono)", fontSize: 10, color: "var(--text-3)", whiteSpace: "nowrap" }}>
                        {new Date(d.created_at).toISOString().replace("T", " ").slice(0, 19)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div style={{
        marginTop: 1, padding: "8px 24px", background: "var(--bg-1)",
        borderTop: "1px solid var(--line)", display: "flex", justifyContent: "space-between",
      }}>
        <span style={{ fontFamily: "var(--mono)", fontSize: 9, color: "var(--text-3)", letterSpacing: "0.1em" }}>
          FOCUS SPACE TECHNOLOGIES · ESA KELVINS VALIDATED · 100% RECALL · −38% FALSE ALERTS
        </span>
        <span style={{ fontFamily: "var(--mono)", fontSize: 9, color: "var(--text-3)", letterSpacing: "0.1em" }}>
          CONTRIBUTIONS C3+C4 INPI · HYBRID AND ENGINE
        </span>
      </div>
    </div>
  );
}
EOFcat > src/App.jsx << 'EOF'
import { useState, useEffect } from "react";
import axios from "axios";

const API_URL = "https://focus-api-vg34.onrender.com";
const API_KEY = "focus-dev-key-2026";
const H = { "X-API-Key": API_KEY };

const DEFAULT_CDM = {
  norad_id_primary: 25544,
  norad_id_secondary: 48274,
  tca_hours: 12.5,
  miss_distance_m: 150,
  pc: 0.0003,
  dv_available_ms: 2.5,
  cdm_reliability: 0.85,
};

const LABELS = {
  norad_id_primary: "NORAD PRIMARY",
  norad_id_secondary: "NORAD SECONDARY",
  tca_hours: "TCA (hours)",
  miss_distance_m: "MISS DIST (m)",
  pc: "Pc",
  dv_available_ms: "ΔV AVAIL (m/s)",
  cdm_reliability: "CDM RELIABILITY",
};

const STATUS = {
  maneuver: { color: "var(--red)", bg: "var(--red-dim)", label: "MANEUVER" },
  replan:   { color: "var(--amber)", bg: "var(--amber-dim)", label: "REPLAN" },
  wait:     { color: "var(--green)", bg: "var(--green-dim)", label: "WAIT" },
};

function Tag({ v }) {
  const s = STATUS[v] || { color: "var(--text-2)", bg: "var(--bg-3)", label: v?.toUpperCase() };
  return (
    <span style={{
      fontFamily: "var(--mono)", fontSize: 10, letterSpacing: "0.1em",
      color: s.color, background: s.bg,
      padding: "2px 8px", border: `1px solid ${s.color}55`,
    }}>
      {s.label}
    </span>
  );
}

function Kpi({ label, value, unit, accent }) {
  return (
    <div style={{
      borderLeft: `2px solid ${accent || "var(--line-bright)"}`,
      padding: "12px 16px", background: "var(--bg-1)",
      borderTop: "1px solid var(--line)", borderRight: "1px solid var(--line)", borderBottom: "1px solid var(--line)",
    }}>
      <div style={{ fontFamily: "var(--mono)", fontSize: 9, color: "var(--text-3)", letterSpacing: "0.12em", marginBottom: 6 }}>{label}</div>
      <div style={{ fontFamily: "var(--mono)", fontSize: 26, color: accent || "var(--text)", fontWeight: 500, lineHeight: 1 }}>
        {value}<span style={{ fontSize: 11, color: "var(--text-2)", marginLeft: 4 }}>{unit}</span>
      </div>
    </div>
  );
}

function SectionHeader({ title, sub }) {
  return (
    <div style={{
      borderBottom: "1px solid var(--line)", padding: "8px 16px",
      background: "var(--bg-1)", display: "flex", alignItems: "baseline", gap: 12
    }}>
      <span style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--text-2)", letterSpacing: "0.12em" }}>{title}</span>
      {sub && <span style={{ fontSize: 10, color: "var(--text-3)" }}>{sub}</span>}
    </div>
  );
}

export default function App() {
  const [decisions, setDecisions] = useState([]);
  const [satellites, setSatellites] = useState([]);
  const [health, setHealth]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [cdm, setCdm]         = useState(DEFAULT_CDM);
  const [result, setResult]   = useState(null);
  const [busy, setBusy]       = useState(false);
  const [tick, setTick]       = useState(new Date());

  const pull = async () => {
    try {
      const [d, s, h] = await Promise.all([
        axios.get(`${API_URL}/v1/decisions`, { headers: H }),
        axios.get(`${API_URL}/v1/satellites`, { headers: H }),
        axios.get(`${API_URL}/v1/health`),
      ]);
      setDecisions(d.data); setSatellites(s.data); setHealth(h.data);
    } catch { setHealth(null); }
    finally { setLoading(false); setTick(new Date()); }
  };

  useEffect(() => { pull(); const t = setInterval(pull, 15000); return () => clearInterval(t); }, []);

  const submit = async () => {
    setBusy(true); setResult(null);
    try {
      const r = await axios.post(`${API_URL}/v1/decide`, cdm, { headers: H });
      setResult(r.data); setTimeout(pull, 800);
    } catch { setResult({ error: true }); }
    finally { setBusy(false); }
  };

  const maneuvers = decisions.filter(d => d.decision === "maneuver").length;
  const avgConf   = decisions.length
    ? (decisions.reduce((s, d) => s + d.confidence, 0) / decisions.length * 100).toFixed(1)
    : "—";

  return (
    <div style={{ maxWidth: 1400, margin: "0 auto", padding: "0 0 48px" }}>

      {/* ── Top bar ── */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 24px", height: 48,
        borderBottom: "1px solid var(--line)", background: "var(--bg-1)",
        position: "sticky", top: 0, zIndex: 10,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <span style={{ fontFamily: "var(--mono)", fontSize: 13, color: "var(--text)", letterSpacing: "0.15em", fontWeight: 500 }}>
            FOCUS
          </span>
          <span style={{ fontSize: 10, color: "var(--text-3)", letterSpacing: "0.08em" }}>
            SPACE COLLISION AVOIDANCE · HYBRID AND C3+C4
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <span style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--text-3)" }}>
            {tick.toISOString().replace("T", " ").slice(0, 19)} UTC
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{
              width: 6, height: 6, borderRadius: "50%",
              background: health ? "var(--green)" : "var(--red)",
              animation: health ? "blink 3s infinite" : "none",
            }} />
            <span style={{ fontFamily: "var(--mono)", fontSize: 10, color: health ? "var(--green)" : "var(--red)" }}>
              {health ? "NOMINAL" : "OFFLINE"}
            </span>
          </div>
        </div>
      </div>

      {/* ── KPIs ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 1, margin: "1px 0", background: "var(--line)" }}>
        <Kpi label="SATELLITES TRACKED" value={satellites.length} accent="var(--accent)" />
        <Kpi label="TOTAL DECISIONS"     value={decisions.length} accent="var(--text-2)" />
        <Kpi label="MANEUVER REQUIRED"   value={maneuvers} accent="var(--red)" />
        <Kpi label="AVG CONFIDENCE"      value={avgConf} unit="%" accent="var(--green)" />
      </div>

      {/* ── Main grid ── */}
      <div style={{ display: "grid", gridTemplateColumns: "380px 1fr", gap: 1, marginTop: 1, background: "var(--line)" }}>

        {/* CDM Panel */}
        <div style={{ background: "var(--bg)", display: "flex", flexDirection: "column" }}>
          <SectionHeader title="CDM INPUT" sub="Conjunction Data Message" />
          <div style={{ padding: 16, flex: 1 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1, background: "var(--line)", border: "1px solid var(--line)" }}>
              {Object.entries(DEFAULT_CDM).map(([k]) => (
                <div key={k} style={{ background: "var(--bg)", padding: "10px 12px" }}>
                  <div style={{ fontFamily: "var(--mono)", fontSize: 9, color: "var(--text-3)", letterSpacing: "0.1em", marginBottom: 4 }}>
                    {LABELS[k]}
                  </div>
                  <input
                    type="number" step="any" value={cdm[k]}
                    onChange={e => setCdm({ ...cdm, [k]: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              ))}
            </div>

            <button
              onClick={submit} disabled={busy}
              style={{
                marginTop: 12, width: "100%", padding: "10px 0",
                background: busy ? "var(--bg-3)" : "var(--accent)",
                color: busy ? "var(--text-3)" : "#fff",
                fontSize: 11, letterSpacing: "0.12em",
              }}
            >
              {busy ? "PROCESSING..." : "RUN HYBRID AND ANALYSIS"}
            </button>

            {result && (
              <div style={{
                marginTop: 12, padding: 14,
                border: `1px solid ${result.error ? "var(--red-dim)" : STATUS[result.decision]?.color + "44" || "var(--line)"}`,
                background: "var(--bg-1)", animation: "fadein 0.2s ease",
              }}>
                {result.error ? (
                  <div style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--red)" }}>API ERROR</div>
                ) : (
                  <>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                      <Tag v={result.decision} />
                      <span style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--text-2)" }}>
                        CONF {(result.confidence * 100).toFixed(0)}%
                      </span>
                    </div>
                    <div style={{ fontSize: 11, color: "var(--text-2)", lineHeight: 1.6, marginBottom: result.recommended_dv_ms ? 8 : 0 }}>
                      {result.reasoning}
                    </div>
                    {result.recommended_dv_ms && (
                      <div style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--accent)", marginTop: 8, paddingTop: 8, borderTop: "1px solid var(--line)" }}>
                        ΔV = {result.recommended_dv_ms} m/s
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>

          {/* Satellites */}
          <div style={{ borderTop: "1px solid var(--line)" }}>
            <SectionHeader title="TRACKED OBJECTS" sub={`${satellites.length} registered`} />
            <div style={{ padding: "8px 0" }}>
              {satellites.length === 0 ? (
                <div style={{ padding: "16px", fontSize: 11, color: "var(--text-3)", fontFamily: "var(--mono)" }}>
                  NO OBJECTS REGISTERED
                </div>
              ) : satellites.map(sat => (
                <div key={sat.id} style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  padding: "8px 16px", borderBottom: "1px solid var(--line)",
                }}>
                  <div>
                    <div style={{ fontSize: 12, color: "var(--text)", fontWeight: 500 }}>{sat.name}</div>
                    <div style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--text-3)", marginTop: 2 }}>
                      #{sat.norad_id} · {sat.altitude_km}km · {sat.inclination_deg}°inc
                    </div>
                  </div>
                  <Tag v={sat.status === "active" ? "wait" : "maneuver"} />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Decision log */}
        <div style={{ background: "var(--bg)", overflow: "hidden" }}>
          <SectionHeader title="DECISION LOG" sub={`${decisions.length} entries`} />
          {loading ? (
            <div style={{ padding: 24, fontFamily: "var(--mono)", fontSize: 11, color: "var(--text-3)" }}>
              LOADING...
            </div>
          ) : decisions.length === 0 ? (
            <div style={{ padding: 24, fontFamily: "var(--mono)", fontSize: 11, color: "var(--text-3)" }}>
              NO DECISIONS RECORDED — RUN FIRST ANALYSIS
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--line)", background: "var(--bg-1)" }}>
                    {["ID","PRIMARY","SECONDARY","Pc","DIST","TCA","DECISION","CONF","ΔV","TIMESTAMP"].map(h => (
                      <th key={h} style={{
                        padding: "7px 14px", textAlign: "left",
                        fontFamily: "var(--mono)", fontSize: 9, color: "var(--text-3)",
                        letterSpacing: "0.1em", fontWeight: 400, whiteSpace: "nowrap",
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {decisions.map((d, i) => (
                    <tr key={d.id} style={{
                      borderBottom: "1px solid var(--line)",
                      background: i % 2 ? "var(--bg-1)" : "var(--bg)",
                    }}
                      onMouseEnter={e => e.currentTarget.style.background = "var(--bg-3)"}
                      onMouseLeave={e => e.currentTarget.style.background = i % 2 ? "var(--bg-1)" : "var(--bg)"}
                    >
                      <td style={{ padding: "9px 14px", fontFamily: "var(--mono)", fontSize: 11, color: "var(--text-3)" }}>{d.id}</td>
                      <td style={{ padding: "9px 14px", fontFamily: "var(--mono)", fontSize: 11, color: "var(--accent)" }}>{d.norad_id_primary}</td>
                      <td style={{ padding: "9px 14px", fontFamily: "var(--mono)", fontSize: 11 }}>{d.norad_id_secondary}</td>
                      <td style={{ padding: "9px 14px", fontFamily: "var(--mono)", fontSize: 11, color: d.pc > 1e-4 ? "var(--red)" : "var(--green)" }}>
                        {d.pc.toExponential(2)}
                      </td>
                      <td style={{ padding: "9px 14px", fontFamily: "var(--mono)", fontSize: 11 }}>{d.miss_distance_m}m</td>
                      <td style={{ padding: "9px 14px", fontFamily: "var(--mono)", fontSize: 11 }}>{d.tca_hours}h</td>
                      <td style={{ padding: "9px 14px" }}><Tag v={d.decision} /></td>
                      <td style={{ padding: "9px 14px", fontFamily: "var(--mono)", fontSize: 11, color: "var(--text-2)" }}>
                        {(d.confidence * 100).toFixed(0)}%
                      </td>
                      <td style={{ padding: "9px 14px", fontFamily: "var(--mono)", fontSize: 11, color: "var(--accent)" }}>
                        {d.recommended_dv_ms ? `${d.recommended_dv_ms}` : "—"}
                      </td>
                      <td style={{ padding: "9px 14px", fontFamily: "var(--mono)", fontSize: 10, color: "var(--text-3)", whiteSpace: "nowrap" }}>
                        {new Date(d.created_at).toISOString().replace("T", " ").slice(0, 19)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div style={{
        marginTop: 1, padding: "8px 24px", background: "var(--bg-1)",
        borderTop: "1px solid var(--line)", display: "flex", justifyContent: "space-between",
      }}>
        <span style={{ fontFamily: "var(--mono)", fontSize: 9, color: "var(--text-3)", letterSpacing: "0.1em" }}>
          FOCUS SPACE TECHNOLOGIES · ESA KELVINS VALIDATED · 100% RECALL · −38% FALSE ALERTS
        </span>
        <span style={{ fontFamily: "var(--mono)", fontSize: 9, color: "var(--text-3)", letterSpacing: "0.1em" }}>
          CONTRIBUTIONS C3+C4 INPI · HYBRID AND ENGINE
        </span>
      </div>
    </div>
  );
}
