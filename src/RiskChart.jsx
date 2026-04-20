import { useState, useEffect } from "react";
import axios from "axios";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";

const API_URL = "https://focus-api-vg34.onrender.com";
const API_KEY = "focus-dev-key-2026";
const H = { "X-API-Key": API_KEY };

const RISK_COLORS = {
  LOW: "var(--green)",
  MEDIUM: "var(--amber)",
  HIGH: "var(--red)",
};

function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div style={{
      background: "var(--bg-card)", border: "1px solid var(--border)",
      padding: "10px 14px", borderRadius: 6,
      fontFamily: "var(--mono)", fontSize: 11,
    }}>
      <div style={{ color: "var(--text-2)", marginBottom: 4 }}>H+{d.hour}</div>
      <div style={{ color: RISK_COLORS[d.risk_level] || "var(--blue-light)" }}>
        RISK {(d.risk_score * 100).toFixed(1)}% — {d.risk_level}
      </div>
      <div style={{ color: "var(--text-3)", marginTop: 4 }}>{d.altitude_km} km</div>
      <div style={{ color: "var(--text-3)" }}>{d.latitude_deg}° / {d.longitude_deg}°</div>
    </div>
  );
}

export default function RiskChart({ noradId, name }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!noradId) return;
    setLoading(true);
    setError(false);
    axios.get(`${API_URL}/v1/predict/${noradId}?hours=24`, { headers: H })
      .then(r => { setData(r.data.risk_timeline); setLoading(false); })
      .catch(() => { setError(true); setLoading(false); });
  }, [noradId]);

  return (
    <div style={{ width: "100%", height: "100%" }}>
      {loading ? (
        <div style={{ padding: 24, fontFamily: "var(--mono)", fontSize: 11, color: "var(--text-3)" }}>
          Loading prediction...
        </div>
      ) : error ? (
        <div style={{ padding: 24, fontFamily: "var(--mono)", fontSize: 11, color: "var(--red)" }}>
          Prediction unavailable
        </div>
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="riskGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="hour"
              tickFormatter={h => `H+${h}`}
              tick={{ fontFamily: "var(--mono)", fontSize: 9, fill: "var(--text-3)" }}
              axisLine={{ stroke: "var(--border)" }}
              tickLine={false}
            />
            <YAxis
              domain={[0, 1]}
              tickFormatter={v => `${(v * 100).toFixed(0)}%`}
              tick={{ fontFamily: "var(--mono)", fontSize: 9, fill: "var(--text-3)" }}
              axisLine={{ stroke: "var(--border)" }}
              tickLine={false}
              width={40}
            />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine y={0.6} stroke="var(--red)" strokeDasharray="4 2" strokeOpacity={0.5} />
            <ReferenceLine y={0.3} stroke="var(--amber)" strokeDasharray="4 2" strokeOpacity={0.5} />
            <Area
              type="monotone" dataKey="risk_score"
              stroke="var(--blue-light)" strokeWidth={2}
              fill="url(#riskGradient)"
              dot={false} activeDot={{ r: 4, fill: "var(--blue-light)" }}
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
