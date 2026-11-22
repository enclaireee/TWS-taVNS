"use client";
import { useEffect, useRef, useState } from "react";
import {
  abort,
  clearReview,
  connectTelemetry,
  getEvents,
  getResults,
  getScenarios,
  getState,
  injectLive,
  playScenario,
  startLive,
  type DeviceEvent,
  type LiveInjection,
  type Result,
  type Scenario,
  type Telemetry,
} from "@/lib/api";
import { Hero } from "@/components/Hero";
import { EventFeed } from "@/components/EventFeed";

const SPEEDS = [1, 5, 10, 25] as const;

function splitTitle(title: string): [string, string | null] {
  const idx = title.indexOf(":");
  if (idx === -1) return [title, null];
  return [title.slice(0, idx).trim(), title.slice(idx + 1).trim()];
}

function formatClock(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export default function Page() {
  const [tel, setTel] = useState<Telemetry | null>(null);
  const [ppgWave, setPpgWave] = useState<number[]>([]);
  const [eegWave, setEegWave] = useState<number[]>([]);
  const [connected, setConnected] = useState(false);
  const [linkKnown, setLinkKnown] = useState(false);
  const [events, setEvents] = useState<DeviceEvent[]>([]);
  const [evErr, setEvErr] = useState(false);
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [results, setResults] = useState<Result[] | null>(null);
  const [running, setRunning] = useState(false);
  const [speed, setSpeed] = useState<number>(10);
  const [msg, setMsg] = useState("");

  const telRef = useRef<Telemetry | null>(null);
  const ppgRef = useRef<number[]>([]);
  const eegRef = useRef<number[]>([]);
  const lastTRef = useRef<number>(-1);
  const dirty = useRef(false);

  useEffect(() => {
    const ingest = (t: Telemetry) => {
      if (lastTRef.current >= 0 && t.t < lastTRef.current) {
        ppgRef.current = [];
        eegRef.current = [];
      }
      lastTRef.current = t.t;

      if (t.ppg && t.ppg.length > 0) {
        // Append the newest 12 samples (~250 ms at 48 Hz) so the pulse scrolls smoothly
        const chunk = ppgRef.current.length === 0 ? t.ppg : t.ppg.slice(-12);
        ppgRef.current = [...ppgRef.current, ...chunk].slice(-120);
      } else if (!t.link_ok) {
        ppgRef.current = [];
      }

      if (t.eeg && t.eeg.length > 0) {
        const chunk = eegRef.current.length === 0 ? t.eeg : t.eeg.slice(-12);
        eegRef.current = [...eegRef.current, ...chunk].slice(-120);
      } else if (!t.link_ok) {
        eegRef.current = [];
      }

      telRef.current = t;
      dirty.current = true;
    };

    getState()
      .then((t) => {
        if (!telRef.current) ingest(t);
      })
      .catch(() => {});

    const stop = connectTelemetry(ingest, (c) => {
      setConnected(c);
      setLinkKnown(true);
    });

    const id = setInterval(() => {
      if (!dirty.current) return;
      dirty.current = false;
      setTel(telRef.current);
      setPpgWave(ppgRef.current.slice());
      setEegWave(eegRef.current.slice());
    }, 125);

    return () => {
      stop();
      clearInterval(id);
    };
  }, []);

  useEffect(() => {
    let alive = true;
    const poll = () =>
      getEvents()
        .then((e) => {
          if (alive) {
            setEvents(e);
            setEvErr(false);
          }
        })
        .catch(() => alive && setEvErr(true));
    poll();
    const id = setInterval(poll, 1000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  useEffect(() => {
    getScenarios()
      .then(setScenarios)
      .catch(() => setMsg("Backend unreachable on :8000"));
  }, []);

  const runAll = async () => {
    setRunning(true);
    setMsg("");
    try {
      setResults(await getResults());
    } catch {
      setMsg("Could not run scenarios");
    }
    setRunning(false);
  };

  const act = (p: Promise<unknown>, fallback = "Request failed") =>
    p
      .then((res) => {
        setMsg("");
        if (res && typeof res === "object" && "state" in res) {
          const next = res as Telemetry;
          telRef.current = next;
          dirty.current = true;
          setTel(next);
        }
      })
      .catch((err: unknown) => {
        setMsg(
          err instanceof Error && err.message.includes("409")
            ? "Review required: clear review before starting a new scenario or live trigger."
            : fallback,
        );
      });

  const handleClearReview = () => act(clearReview(), "Could not clear review");
  const handleAbort = () => act(abort(), "Abort failed");
  const handleInject = (kind: LiveInjection) => act(injectLive(kind), "Could not trigger live event");
  const handleStartLive = () => {
    ppgRef.current = [];
    eegRef.current = [];
    act(startLive(2), "Could not start live mode");
  };

  const down = linkKnown && !connected;
  const passed = results?.filter((r) => r.pass).length ?? 0;
  const total = results?.length ?? 0;
  const resultMap = new Map(results?.map((r) => [r.key, r.pass]) ?? []);

  return (
    <div className="shell">
      <header className="header">
        <div className="brand-cluster">
          <div className="brand-wordmark">
            <svg
              viewBox="0 0 1024 1024"
              width="22"
              height="22"
              fill="none"
              aria-hidden="true"
              style={{ flex: "none" }}
            >
              <path
                d="M710 388C710 258 634 196 516 196C384 196 310 312 310 512C310 712 384 828 516 828C634 828 710 766 710 636"
                stroke="#F5F5F8"
                strokeWidth="66"
                strokeLinecap="butt"
              />
              <path
                d="M396 512H470L522 396L586 628L632 512H732"
                stroke="#9B82F6"
                strokeWidth="54"
                strokeLinecap="butt"
                strokeLinejoin="miter"
                strokeMiterlimit="10"
              />
            </svg>
            <span>taVNS</span>
            <span className="brand-divider" aria-hidden="true" />
            <span className="brand-sub">Closed-Loop Earbud Monitor</span>
          </div>

          <span
            className={`live-caption ${down ? "warn" : connected ? "ok" : ""}`}
            role="status"
          >
            {down
              ? "Device autonomous"
              : connected
                ? tel?.live_mode
                  ? "Live human stream"
                  : "Scenario replay"
                : "Connecting"}
          </span>
        </div>

        <div className="header-controls">
          {tel && (
            <span className="elapsed-time" title="Simulated elapsed time">
              {formatClock(tel.t)}
            </span>
          )}

          {tel?.review_required && (
            <button
              className="btn-soft"
              onClick={handleClearReview}
              disabled={down}
            >
              Clear review
            </button>
          )}

          <button
            className="btn-abort"
            onClick={handleAbort}
            aria-label="Abort stimulation"
          >
            Abort
          </button>
        </div>
      </header>

      <main style={{ display: "grid", gap: 20 }}>
        <Hero
          tel={tel}
          ppgWave={ppgWave}
          eegWave={eegWave}
          connected={connected}
          linkKnown={linkKnown}
          onClearReview={handleClearReview}
          onInject={handleInject}
          onStartLive={handleStartLive}
        />

        <div className="deck">
          {/* Automated Verification Scenarios */}
          <section className="surface-panel" aria-labelledby="h-verify">
            <div className="panel-header">
              <h2 id="h-verify" className="serif-heading">
                Verification scenarios
              </h2>

              <div className="panel-actions">
                <div className="speed-pills" role="group" aria-label="Scenario playback speed">
                  {SPEEDS.map((sp) => (
                    <button
                      key={sp}
                      className={`speed-opt ${speed === sp ? "on" : ""}`}
                      onClick={() => setSpeed(sp)}
                      aria-pressed={speed === sp}
                    >
                      {sp}×
                    </button>
                  ))}
                </div>

                <button
                  className="btn-verify"
                  onClick={runAll}
                  disabled={running || down}
                >
                  {running ? "Verifying..." : "Verify all 9"}
                </button>
              </div>
            </div>

            {results && (
              <div className={`score-summary ${passed === total ? "" : "warn"}`}>
                <span>
                  <strong>
                    {passed} of {total} scenarios passed
                  </strong>{" "}
                  — all seizure detection and safety interlock rules verified.
                </span>
                <strong>{Math.round((passed / total) * 100)}%</strong>
              </div>
            )}

            {msg && (
              <p className="err-inline" role="alert">
                {msg}
              </p>
            )}

            <ul className="scenario-grid" aria-label="Scripted test scenarios">
              {scenarios.map((s) => {
                const on = !tel?.live_mode && tel?.scenario === s.key && !tel.done;
                const [cond, expected] = splitTitle(s.title);
                const passState = resultMap.get(s.key);

                return (
                  <li key={s.key}>
                    <button
                      className={`scn-tile ${on ? "on" : ""}`}
                      disabled={down}
                      onClick={() => act(playScenario(s.key, speed))}
                      aria-current={on ? "true" : undefined}
                    >
                      <div className="scn-tile-top">
                        <span className="scn-status">
                          {on ? (
                            <>
                              <span className="eq" aria-hidden="true">
                                <i />
                                <i />
                                <i />
                              </span>
                              Playing
                            </>
                          ) : (
                            "Replay"
                          )}
                        </span>
                        {passState === true && (
                          <span className="scn-pass-badge">Passed</span>
                        )}
                        {passState === false && (
                          <span className="scn-fail-badge">Failed</span>
                        )}
                      </div>

                      <div>
                        <div className="scn-name">{cond}</div>
                        {expected && <div className="scn-expect">{expected}</div>}
                      </div>
                    </button>
                  </li>
                );
              })}

              {scenarios.length === 0 && (
                <li style={{ color: "var(--muted)", fontSize: 13 }}>
                  No scenarios loaded.
                </li>
              )}
            </ul>
          </section>

          {/* Clean Event Audit Log */}
          <section className="surface-panel" aria-labelledby="h-timeline">
            <div className="panel-header">
              <h2 id="h-timeline" className="serif-heading">
                Event log
              </h2>
              <span style={{ fontSize: 12.5, color: "var(--muted)" }}>
                {events.length} events
              </span>
            </div>

            <EventFeed events={events} tel={tel} err={evErr} />
          </section>
        </div>
      </main>

      <footer className="page-footnote">
        <span>
          <strong>Synthetic demo data — no clinical claim.</strong> Sensitivity
          and false alarms per 24 h: pending CHB-MIT evaluation.
        </span>
        <span>Closed-loop earbud safety layer · Abort always wins</span>
      </footer>
    </div>
  );
}
