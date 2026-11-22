import type { DeviceState, LiveInjection, Stim, Telemetry } from "@/lib/api";
import { EarbudTwin, VitalityRing } from "@/components/EarbudVisual";

export type Frame = { t: number; hr: number | null };

const STEPS: { key: DeviceState; label: string }[] = [
  { key: "monitor", label: "Monitoring" },
  { key: "stim", label: "Stimulating" },
  { key: "cooldown", label: "Cooldown" },
  { key: "locked", label: "Locked" },
  { key: "safe_mode", label: "Safe mode" },
];

const STATE_COPY: Record<DeviceState, { title: string; note: string }> = {
  monitor: {
    title: "Monitoring",
    note: "Tracking continuous PPG pulse, EEG rhythm, and ear motion; seizure detector armed.",
  },
  stim: {
    title: "Stimulating",
    note: "Seizure confirmed — delivering charge-balanced biphasic taVNS pulses at cymba conchae.",
  },
  cooldown: {
    title: "Cooldown",
    note: "Post-stimulation refractory window active; repeat stimulation triggers suppressed.",
  },
  locked: {
    title: "Safety locked",
    note: "Safety gate blocked stimulation to protect against physiological or hardware hazards.",
  },
  safe_mode: {
    title: "Safe mode",
    note: "Sensor transport degraded; stimulator output stage isolated until link recovers.",
  },
};

const LIVE_TRIGGERS: {
  key: LiveInjection;
  label: string;
  hint: string;
  tone?: "accent" | "danger" | "neutral";
}[] = [
  { key: "seizure", label: "Trigger seizure", hint: "18 Hz EEG + clonic", tone: "accent" },
  { key: "hr_drop", label: "HR drop", hint: "36 bpm lock", tone: "danger" },
  { key: "fall", label: "Simulate fall", hint: "Impact + still", tone: "danger" },
  { key: "chewing", label: "Chewing artefact", hint: "Rejected by DSP", tone: "neutral" },
  { key: "electrode_off", label: "Electrode off", hint: "250 kΩ hold", tone: "neutral" },
  { key: "drop_link", label: "Drop link", hint: "Enter safe mode", tone: "danger" },
  { key: "normal", label: "Reset normal", hint: "Calm baseline", tone: "neutral" },
];

function smoothPath(pts: [number, number][]): string {
  if (pts.length === 0) return "";
  if (pts.length === 1) return `M ${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
  let d = `M ${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(pts.length - 1, i + 2)];
    const cp1x = p1[0] + (p2[0] - p0[0]) / 6;
    const cp1y = p1[1] + (p2[1] - p0[1]) / 6;
    const cp2x = p2[0] - (p3[0] - p1[0]) / 6;
    const cp2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
  }
  return d;
}

function LiveSignalScope({
  title,
  meta,
  samples,
  fixedRange,
  stroke,
  emptyText,
}: {
  title: string;
  meta: string;
  samples: number[];
  fixedRange?: [number, number];
  stroke: string;
  emptyText: string;
}) {
  const W = 460;
  const H = 68;
  const PAD_Y = 8;

  if (samples.length < 4) {
    return (
      <div className="wave-module">
        <div className="wave-head">
          <strong>{title}</strong>
          <span>{meta}</span>
        </div>
        <div className="scope-canvas" aria-hidden="true">
          <span className="ribbon-empty">{emptyText}</span>
        </div>
      </div>
    );
  }

  let lo: number;
  let hi: number;
  if (fixedRange) {
    [lo, hi] = fixedRange;
  } else {
    const mn = Math.min(...samples);
    const mx = Math.max(...samples);
    const pad = Math.max((mx - mn) * 0.18, 25);
    lo = mn - pad;
    hi = mx + pad;
  }

  const pts: [number, number][] = samples.map((v, i) => {
    const x = (i / (samples.length - 1)) * (W - 10) + 2;
    const clamped = Math.max(lo, Math.min(hi, v));
    const y = PAD_Y + (1 - (clamped - lo) / (hi - lo || 1)) * (H - PAD_Y * 2);
    return [x, y];
  });
  const head = pts[pts.length - 1];

  return (
    <div className="wave-module">
      <div className="wave-head">
        <strong>{title}</strong>
        <span>{meta}</span>
      </div>
      <div className="scope-canvas" aria-hidden="true">
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
          <line x1="0" x2={W} y1={H * 0.5} y2={H * 0.5} stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
          <path
            d={smoothPath(pts)}
            fill="none"
            stroke={stroke}
            strokeWidth="1.8"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
          <circle cx={head[0]} cy={head[1]} r="3" fill="#ffffff" stroke={stroke} strokeWidth="1.5" />
        </svg>
      </div>
    </div>
  );
}

function StimWaveform({ stim }: { stim: Stim }) {
  const W = 440;
  const H = 44;
  const mid = H / 2;
  const pulses = Math.max(6, Math.min(14, Math.round(stim.freq_Hz * 0.4)));
  const period = W / pulses;
  const ampPx = Math.max(7, Math.min(16, (stim.amp_mA / 5) * 16 + 5));
  const pwPx = Math.max(2.5, Math.min(period * 0.22, (stim.pw_us / 500) * 10 + 2));

  let d = `M 0 ${mid}`;
  for (let i = 0; i < pulses * 2; i++) {
    const x0 = i * period + 5;
    const x1 = x0 + pwPx;
    const x2 = x1 + 1.5;
    const x3 = x2 + pwPx;
    d += ` L ${x0.toFixed(1)} ${mid} L ${x0.toFixed(1)} ${(mid - ampPx).toFixed(1)} L ${x1.toFixed(1)} ${(mid - ampPx).toFixed(1)} L ${x1.toFixed(1)} ${mid}`;
    d += ` L ${x2.toFixed(1)} ${mid} L ${x2.toFixed(1)} ${(mid + ampPx).toFixed(1)} L ${x3.toFixed(1)} ${(mid + ampPx).toFixed(1)} L ${x3.toFixed(1)} ${mid}`;
  }
  d += ` L ${W * 2} ${mid}`;

  return (
    <div
      className="pulse-canvas"
      aria-label={`Live biphasic pulse train: ${stim.amp_mA} mA, ${stim.freq_Hz} Hz, ${stim.pw_us} microseconds`}
    >
      <svg viewBox={`0 0 ${W * 2} ${H}`} preserveAspectRatio="none" className="pulse-scroll">
        <line x1="0" y1={mid} x2={W * 2} y2={mid} stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
        <path d={d} fill="none" stroke="#9b82f6" strokeWidth="1.75" vectorEffect="non-scaling-stroke" />
      </svg>
    </div>
  );
}

function ClosedLoopFlow({ tel, down }: { tel: Telemetry; down: boolean }) {
  const locked = tel.state === "locked" || tel.state === "safe_mode";
  const stim = tel.stimulating && Boolean(tel.stim);
  const live = !down && !tel.done;

  const nodes = [
    { label: "Earbud", val: tel.hr != null ? "PPG · EEG · IMU" : "No signal", tone: tel.hr != null ? "ok" : "warn" },
    { label: "Transport", val: down ? "Autonomous" : tel.link_ok ? "CRC32 OK" : "Link lost", tone: down ? "warn" : tel.link_ok ? "ok" : "bad" },
    { label: "Signal DSP", val: stim ? "Seizure flagged" : "Filtering", tone: stim ? "accent" : "ok" },
    { label: "Safety Gate", val: STATE_COPY[tel.state].title, tone: locked ? "bad" : stim ? "accent" : tel.state === "cooldown" ? "warn" : "ok" },
    { label: "Stimulator", val: stim && tel.stim ? `${tel.stim.amp_mA.toFixed(1)} mA live` : locked ? "Blocked" : "Isolated", tone: stim ? "accent" : locked ? "bad" : "idle" },
  ];

  return (
    <div className="flow-bar" aria-label="Closed-loop hardware pipeline">
      {nodes.map((n, i) => {
        const edgeBlocked = i === 3 && locked;
        const edgeStim = i >= 2 && stim;
        return (
          <div key={n.label} className="flow-segment">
            <div className={`flow-node ${n.tone}`}>
              <span className="flow-k">{n.label}</span>
              <span className="flow-v">{n.val}</span>
            </div>
            {i < nodes.length - 1 && (
              <div
                className={`flow-wire ${edgeBlocked ? "blocked" : edgeStim ? "accent" : live ? "live" : ""}`}
                aria-hidden="true"
              >
                {!edgeBlocked && live && <span className="wire-pulse" />}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function Hero({
  tel,
  ppgWave,
  eegWave,
  connected,
  linkKnown,
  onClearReview,
  onInject,
  onStartLive,
}: {
  tel: Telemetry | null;
  ppgWave: number[];
  eegWave: number[];
  connected: boolean;
  linkKnown: boolean;
  onClearReview: () => void;
  onInject: (kind: LiveInjection) => void;
  onStartLive: () => void;
}) {
  const down = linkKnown && !connected;

  if (!tel) {
    return (
      <section className="hero-stage" aria-busy="true" aria-label="Live earbud telemetry">
        {down && (
          <div className="autonomous-bar" role="status">
            <span>Device autonomous — live link lost. Therapy continues safely on the earbud.</span>
          </div>
        )}
        <div className="hero-stage-in">
          <div className="skel" style={{ height: 42, width: "36%" }} />
          <div className="skel" style={{ height: 260 }} />
        </div>
      </section>
    );
  }

  const copy = STATE_COPY[tel.state];
  const delta =
    tel.hr != null && tel.hr_baseline != null
      ? Math.round(tel.hr - tel.hr_baseline)
      : null;
  const hrAlert = delta != null && delta <= -15;
  const locked = tel.lock_reasons.length > 0 || tel.review_required;
  const highImp = tel.impedance_kohm != null && tel.impedance_kohm > 50;
  const s = tel.stim;
  const activeInj = new Set(tel.injections ?? []);
  const eegBurst = activeInj.has("seizure") || tel.state === "stim";

  return (
    <section
      className={`hero-stage state-${tel.state}`}
      aria-label="Live earbud telemetry"
    >
      <span className="sr-only" aria-live="polite">
        Device state: {copy.title}
      </span>

      {down && (
        <div className="autonomous-bar" role="status">
          <span>
            <strong>Device autonomous</strong> — live link lost. Closed-loop therapy and safety locks continue on the earbud; no commands are queued.
          </span>
        </div>
      )}

      <div className={`hero-stage-in ${down ? "dim" : ""}`}>
        {/* Clean Top State Row — Zero decorative dots */}
        <div className="hero-top">
          <div className="hero-state-copy">
            <h1 className="hero-title">{copy.title}</h1>
            <p className="hero-state-note">{copy.note}</p>
          </div>

          <ol className="state-journey" role="list" aria-label="Safety state machine">
            {STEPS.map((st) => {
              const on = st.key === tel.state;
              return (
                <li
                  key={st.key}
                  role="listitem"
                  className={`journey-node ${st.key} ${on ? "on" : ""}`}
                  aria-current={on ? "step" : undefined}
                >
                  {st.label}
                </li>
              );
            })}
          </ol>
        </div>

        {/* Lock / Review Interlock Banner */}
        {locked && (
          <div className="lock-alert" role="alert">
            <div>
              <strong>
                {tel.review_required
                  ? "Manual review required before stimulation can resume"
                  : "Safety interlock active — stimulation held"}
              </strong>
              {tel.lock_reasons.length > 0 && (
                <p>{tel.lock_reasons.join(" · ")}</p>
              )}
            </div>
            {tel.review_required && (
              <button className="btn-soft" onClick={onClearReview} disabled={down}>
                Clear review
              </button>
            )}
          </div>
        )}

        {/* 3-Zone Live Telemetry Monitor */}
        <div className="showcase-grid">
          <EarbudTwin tel={tel} down={down} />

          <div className="dial-col">
            <VitalityRing
              hr={tel.hr}
              baseline={tel.hr_baseline}
              state={tel.state}
              stimAmp={tel.stimulating && s ? s.amp_mA : null}
              hrAlert={hrAlert}
            />
            <div className="vitals-mini">
              <div className="vm-cell">
                <span className="vm-k">Impedance</span>
                <span className={`vm-v ${highImp ? "bad" : ""}`}>
                  {tel.impedance_kohm != null ? `${tel.impedance_kohm.toFixed(1)} kΩ` : "--"}
                </span>
              </div>
              <div className="vm-cell">
                <span className="vm-k">Motion</span>
                <span className="vm-v">
                  {tel.imu_g != null ? `${tel.imu_g.toFixed(2)} g` : "--"}
                </span>
              </div>
              <div className="vm-cell">
                <span className="vm-k">Packets lost</span>
                <span className={`vm-v ${tel.lost > 0 ? "bad" : ""}`}>
                  {tel.lost}
                </span>
              </div>
            </div>
          </div>

          <div className="wave-stack">
            <LiveSignalScope
              title="Cardiac PPG pulse"
              meta={tel.hr != null ? `${tel.hr.toFixed(0)} bpm · 48 Hz` : "No pulse"}
              samples={ppgWave}
              fixedRange={[-1.4, 1.4]}
              stroke={hrAlert || locked ? "#f05259" : "#f2f2f7"}
              emptyText="Waiting for optical PPG pulse..."
            />

            <LiveSignalScope
              title="Auricular EEG signal"
              meta={eegBurst ? "18 Hz ictal burst" : activeInj.has("chewing") ? "EMG artefact" : "Alpha baseline · 256 Hz"}
              samples={eegWave}
              stroke={eegBurst ? "#9b82f6" : activeInj.has("chewing") ? "#e8a838" : "#a1a1b0"}
              emptyText="Waiting for EEG stream..."
            />

            {tel.stimulating && s ? (
              <div className="wave-module active-stim">
                <div className="wave-head">
                  <strong>Active taVNS stimulation</strong>
                  <span className="stim-live-meta">
                    {s.site} · {s.reason}
                  </span>
                </div>

                <StimWaveform stim={s} />

                <dl className="dosage-strip">
                  <div className="dosage-item">
                    <dt>Amplitude</dt>
                    <dd>{s.amp_mA.toFixed(1)} mA</dd>
                    <div className="cap-track"><i style={{ width: `${Math.min(100, (s.amp_mA / 5) * 100)}%` }} /></div>
                  </div>
                  <div className="dosage-item">
                    <dt>Frequency</dt>
                    <dd>{s.freq_Hz} Hz</dd>
                    <div className="cap-track"><i style={{ width: `${Math.min(100, (s.freq_Hz / 30) * 100)}%` }} /></div>
                  </div>
                  <div className="dosage-item">
                    <dt>Pulse width</dt>
                    <dd>{s.pw_us} µs</dd>
                    <div className="cap-track"><i style={{ width: `${Math.min(100, (s.pw_us / 500) * 100)}%` }} /></div>
                  </div>
                  <div className="dosage-item">
                    <dt>Duration</dt>
                    <dd>{s.duration_s} s</dd>
                    <span className="cap-note">Single train</span>
                  </div>
                </dl>
              </div>
            ) : (
              <div className="wave-module">
                <div className="standby-row">
                  <span>
                    <strong>Output stage isolated</strong> — no stimulation delivered
                  </span>
                  <span>Hard limits: 5.0 mA · 30 Hz · 500 µs</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Interactive Live Human Presentation Controls */}
        <div className="live-controls" aria-label="Interactive live demo triggers">
          <div className="live-controls-head">
            <div>
              <strong className="lc-title">Live patient simulator</strong>
              <span className="lc-sub">
                {tel.live_mode
                  ? "Tracking continuous human baseline — inject events live to demonstrate closed-loop detection & safety locks"
                  : `Replaying scripted scenario (${tel.scenario})`}
              </span>
            </div>
            {!tel.live_mode && (
              <button className="btn-live-return" onClick={onStartLive} disabled={down}>
                Return to live human
              </button>
            )}
          </div>

          <div className="trigger-grid">
            {LIVE_TRIGGERS.map((tr) => {
              const active = activeInj.has(tr.key);
              return (
                <button
                  key={tr.key}
                  className={`trigger-btn ${tr.tone ?? "neutral"} ${active ? "active" : ""}`}
                  disabled={down}
                  onClick={() => onInject(tr.key)}
                  aria-pressed={active}
                >
                  <span className="tr-label">{tr.label}</span>
                  <span className="tr-hint">{active ? "Active now" : tr.hint}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Clean 5-Stage Closed-Loop Pipeline */}
        <ClosedLoopFlow tel={tel} down={down} />
      </div>
    </section>
  );
}
