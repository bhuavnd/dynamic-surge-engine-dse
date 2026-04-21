import React, { useEffect, useMemo, useState } from "react";
import {
  ResponsiveContainer, AreaChart, Area, CartesianGrid,
  XAxis, YAxis, Tooltip, BarChart, Bar
} from "recharts";
import {
  Activity, MapPinned, Users, Zap,
  CloudRain, PartyPopper, Bell
} from "lucide-react";
import "./App.css";

const API = process.env.REACT_APP_API_URL || "https://dynamic-surge-api.onrender.com";
const MAP_URL = process.env.REACT_APP_MAP_URL || "/map.html?embed=1";

export default function App() {
  const [regions, setRegions] = useState([]);
  const [scenario, setScenario] = useState({ rain: 0, event: 0 });
  const [history, setHistory] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [now, setNow] = useState(new Date());
  const [stats, setStats] = useState({ drivers: 0, riders: 0, high: 0, avg: 1 });

  useEffect(() => {
    loadAll();
    const a = setInterval(loadAll, 4000);
    const b = setInterval(() => setNow(new Date()), 1000);
    return () => { clearInterval(a); clearInterval(b); };
  }, []);

  async function loadAll() {
    try {
      const [r1, r2] = await Promise.all([
        fetch(`${API}/surge/all`),
        fetch(`${API}/scenario`)
      ]);

      const data = await r1.json();
      const sc = await r2.json();

      const safeData = Array.isArray(data) ? data : [];
      setRegions(safeData);
      setScenario(sc);

      let drivers = 0, riders = 0, high = 0, total = 0;

      safeData.forEach(r => {
        const s = Number(r.surge_multiplier || 1);
        drivers += Number(r.drivers || 0);
        riders += Number(r.riders || 0);
        total += s;
        if (s >= 2) high++;
      });

      const avg = safeData.length ? total / safeData.length : 1;

      setStats({
        drivers,
        riders,
        high,
        avg: avg.toFixed(2)
      });

      setHistory(prev => [
        ...prev.slice(-11),
        {
          time: new Date().toLocaleTimeString(),
          surge: Math.max(
            1,
            +(avg + (Math.random() * 0.15 - 0.07) + (sc.rain ? 0.15 : 0) + (sc.event ? 0.2 : 0)).toFixed(2)
          )
        }
      ]);

      buildAlerts(safeData, sc, high);
    } catch (e) {
      console.log(e);
    }
  }

  function buildAlerts(data, sc, high) {
    const top = [...data].sort((a, b) =>
      Number(b.surge_multiplier) - Number(a.surge_multiplier)
    )[0];

    setAlerts([
      { type: "danger", text: `Highest surge in ${top?.area || "N/A"} (${top?.surge_multiplier || 1}x)` },
      { type: "info", text: `${high} high-demand zones active` },
      { type: sc.rain ? "warning" : "success", text: sc.rain ? "Rain mode affecting supply" : "Weather stable" },
      { type: sc.event ? "warning" : "success", text: sc.event ? "Event spikes detected" : "No event hotspots" }
    ]);
  }

  async function updateScenario(key, value) {
    const body = { ...scenario, [key]: value };
    await fetch(`${API}/scenario`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    setScenario(body);
    setTimeout(loadAll, 300);
  }

  const topRegions = useMemo(() =>
    [...regions]
      .sort((a, b) => Number(b.surge_multiplier) - Number(a.surge_multiplier))
      .slice(0, 6),
    [regions]
  );

  return (
    <div className="app-shell">
      <header className="topbar glass">
        <div>
          <div className="brand">🚀 Dynamic Surge Intelligence</div>
          <div className="sub">Real-time Pricing Control Center</div>
        </div>
        <div className="top-right">
          <span className="live-dot" />
          <span>ONLINE</span>
          <span className="clock">{now.toLocaleTimeString()}</span>
        </div>
      </header>

      <section className="kpi-grid">
        <KPI icon={<Users size={18} />} title="Active Drivers" value={stats.drivers} />
        <KPI icon={<Activity size={18} />} title="Active Riders" value={stats.riders} />
        <KPI icon={<Zap size={18} />} title="High Surge Areas" value={stats.high} />
        <KPI icon={<MapPinned size={18} />} title="Average Surge" value={`${stats.avg}x`} />
      </section>

      <section className="main-grid">
        <div className="left-col">
          <div className="glass panel">
            <div className="panel-title">🗺 Live Surge Map</div>
            <iframe title="map" src={MAP_URL} className="map-frame" />
          </div>

          <div className="glass panel">
            <div className="panel-title">📈 Surge Trend</div>
            <div className="chart-wrap">
              {history.length ? (
                <ResponsiveContainer>
                  <AreaChart data={history}>
                    <CartesianGrid stroke="#334155" strokeDasharray="4 4" />
                    <XAxis dataKey="time" />
                    <YAxis domain={[1, 4]} />
                    <Tooltip />
                    <Area dataKey="surge" stroke="#00ffd0" fill="#00ffd033" strokeWidth={3} />
                  </AreaChart>
                </ResponsiveContainer>
              ) : <div className="empty-state">Loading chart...</div>}
            </div>
          </div>
        </div>

        <div className="right-col">
          <div className="glass panel">
            <div className="panel-title">⚙ Control Center</div>
            <div className="control-row">
              <button className={scenario.rain ? "btn active" : "btn"}
                onClick={() => updateScenario("rain", scenario.rain ? 0 : 1)}>
                <CloudRain size={16} /> Rain {scenario.rain ? "ON" : "OFF"}
              </button>

              <button className={scenario.event ? "btn pink active" : "btn pink"}
                onClick={() => updateScenario("event", scenario.event ? 0 : 1)}>
                <PartyPopper size={16} /> Event {scenario.event ? "ON" : "OFF"}
              </button>
            </div>
          </div>

          <div className="glass panel">
            <div className="panel-title">🔔 AI Insights</div>
            <div className="alerts-wrap">
              {alerts.map((a, i) => (
                <div key={i} className={`alert-box ${a.type}`}>
                  <Bell size={14} /> {a.text}
                </div>
              ))}
            </div>
          </div>

          <div className="glass panel">
            <div className="panel-title">🏆 Top Demand Areas</div>
            <div className="chart-wrap tall">
              {topRegions.length ? (
                <ResponsiveContainer>
                  <BarChart data={topRegions} layout="vertical" margin={{ left: 40, right: 10 }}>
                    <CartesianGrid stroke="#334155" strokeDasharray="4 4" />
                    <XAxis type="number" domain={[0, 4]} />
                    <YAxis type="category" dataKey="area" width={110} />
                    <Tooltip />
                    <Bar dataKey="surge_multiplier" fill="#7c3aed" radius={[0, 8, 8, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : <div className="empty-state">Loading areas...</div>}
            </div>
          </div>
        </div>
      </section>

      <section>
        <div className="section-head">📍 Area Surge Pricing</div>
        <div className="zones-grid">
          {regions.map((r, i) => {
            const high = Number(r.surge_multiplier) >= 2;
            return (
              <div key={i} className={`zone-card glass ${high ? "danger" : ""}`}>
                <div className="zone-top">
                  <span>{r.area}</span>
                  <span className="badge">{r.surge_multiplier}x</span>
                </div>
                <div className="zone-stats">
                  <div>Drivers: {r.drivers}</div>
                  <div>Riders: {r.riders}</div>
                </div>
                <div className="mini">
                  <span>Rule {r.rule_surge}x</span>
                  <span>ML {r.ml_surge}x</span>
                </div>
                {high && <div className="alert">HIGH DEMAND 🔥</div>}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function KPI({ title, value, icon }) {
  return (
    <div className="glass kpi">
      <div className="kpi-top">{icon}<span>{title}</span></div>
      <div className="kpi-value">{value}</div>
    </div>
  );
}