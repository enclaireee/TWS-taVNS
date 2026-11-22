"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  abort, connectTelemetry, getEvents, getState, getResults, getScenarios, playScenario,
  type DeviceEvent, type Result, type Scenario, type Telemetry,
} from "@/lib/api";
import { Hero, type Frame } from "@/components/Hero";
import { EventFeed } from "@/components/EventFeed";

function Card({ n, title, label, children, className = "" }: { n?: number; title?: string; label?: string; children: ReactNode; className?: string }) {
  return (
    <section className={`card ${className}`} aria-label={n ? undefined : label} aria-labelledby={n ? `h${n}` : undefined}>
      {n && <h2 id={`h${n}`} className="sec-head"><span className="badge" aria-hidden="true">{n}</span>{title}</h2>}
      {label && <h3 className="lbl">{label}</h3>}
      {children}
    </section>
  );
}

export default function Page() {
  const [tel, setTel] = useState<Telemetry | null>(null);
  const [frames, setFrames] = useState<Frame[]>([]);
  const [connected, setConnected] = useState(false);
  const [linkKnown, setLinkKnown] = useState(false);
  const [events, setEvents] = useState<DeviceEvent[]>([]);
  const [evErr, setEvErr] = useState(false);
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [results, setResults] = useState<Result[] | null>(null);
  const [running, setRunning] = useState(false);
  const [msg, setMsg] = useState("");
  const telRef = useRef<Telemetry | null>(null);
  const bufRef = useRef<Frame[]>([]);
  const dirty = useRef(false);

  useEffect(() => {
    const ingest = (t: Telemetry) => {
      const b = bufRef.current, last = b[b.length - 1];
      if (last && t.t < last.t) b.length = 0; // scenario restarted
      // drop nulls, but keep one null as a gap marker so the line breaks
      if (t.hr != null || (last && last.hr != null)) b.push({ t: t.t, hr: t.hr });
      if (b.length > 120) b.shift();
      telRef.current = t; dirty.current = true;
    };
    getState().then((t) => { if (!telRef.current) ingest(t); }).catch(() => {});
    const stop = connectTelemetry(ingest, (c) => { setConnected(c); setLinkKnown(true); });
    // re-render throttled to ~4/s
    const id = setInterval(() => {
      if (!dirty.current) return;
      dirty.current = false;
      setTel(telRef.current); setFrames(bufRef.current.slice());
    }, 250);
    return () => { stop(); clearInterval(id); };
  }, []);

  useEffect(() => {
    let alive = true;
    const poll = () =>
      getEvents().then((e) => { if (alive) { setEvents(e); setEvErr(false); } }).catch(() => alive && setEvErr(true));
    poll();
    const id = setInterval(poll, 2000);
    return () => { alive = false; clearInterval(id); };
  }, []);

  useEffect(() => { getScenarios().then(setScenarios).catch(() => setMsg("Backend unreachable")); }, []);

  const run = async () => {
    setRunning(true); setMsg("");
    try { setResults(await getResults()); } catch { setMsg("Could not run scenarios"); }
    setRunning(false);
  };
  const act = (p: Promise<unknown>) => p.then(() => setMsg("")).catch(() => setMsg("Request failed"));

  const down = linkKnown && !connected;
  const passed = results?.filter((r) => r.pass).length ?? 0;

  return (
    <>
      <header className="bar">
        <div className="bar-in">
          <span className="wordmark">taVNS</span>
          <span className="link" role="status"><span className={`ldot ${down ? "warn" : connected ? "ok" : ""}`} aria-hidden="true" />{down ? "Device autonomous" : connected ? "Live" : "Connecting"}</span>
          <button className="btn abort" onClick={() => act(abort())} aria-label="ABORT stimulation">ABORT</button>
        </div>
      </header>
      <main className="main">
        <div className="col">
          <Card n={1} title="Live" className="hero-card">
            <Hero tel={tel} frames={frames} connected={connected} linkKnown={linkKnown} />
          </Card>
          <Card n={2} title="Activity">
            <EventFeed events={events} tel={tel} err={evErr} />
          </Card>
        </div>
        <div className="col side">
          <Card n={3} title="Verification">
            <button className="btn" onClick={run} disabled={running || down}>{running ? "Running..." : "Run all scenarios"}</button>
            {msg && <p className="err" role="alert">{msg}</p>}
            <ul className="plist">
              {scenarios.map((s) => {
                const on = tel?.scenario === s.key && !tel.done;
                return (
                  <li key={s.key}>
                    <button className={`play ${on ? "on" : ""}`} disabled={down} onClick={() => act(playScenario(s.key))} aria-current={on ? "true" : undefined}>
                      <span className="play-t">{s.title}</span>
                      {on && <span className="tag">Playing</span>}
                      <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M8 5v14l11-7z" fill="currentColor" /></svg>
                    </button>
                  </li>
                );
              })}
              {scenarios.length === 0 && <li className="muted">No scenarios loaded.</li>}
            </ul>
          </Card>
          <Card n={4} title="Results">
            {results ? (
              <>
                <p className="sum">{passed} of {results.length} passed</p>
                <ul className="rlist">
                  {results.map((r) => (
                    <li key={r.key} className={r.pass ? "pass" : "fail"}>
                      <span className="r-t">{r.title}</span>
                      <span className="rv">{r.pass ? "Pass" : "Fail"}</span>
                    </li>
                  ))}
                </ul>
              </>
            ) : <p className="muted">No results yet. Run all scenarios.</p>}
          </Card>
          <section className="note" aria-label="Model note">
            <p><b>Synthetic demo data.</b></p>
            <p>Sensitivity and false alarms per 24 h: pending CHB-MIT evaluation</p>
          </section>
        </div>
      </main>
    </>
  );
}
