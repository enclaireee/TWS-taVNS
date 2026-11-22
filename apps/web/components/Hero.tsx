import type { DeviceState, Telemetry } from "@/lib/api";

export type Frame = { t: number; hr: number | null };

const STEPS: { key: DeviceState; label: string }[] = [
  { key: "monitor", label: "Monitor" },
  { key: "stim", label: "Stim" },
  { key: "cooldown", label: "Cooldown" },
  { key: "locked", label: "Locked" },
  { key: "safe_mode", label: "Safe mode" },
];
const NAMES: Record<DeviceState, string> = {
  monitor: "Monitoring", stim: "Stimulating", cooldown: "Cooldown", locked: "Locked", safe_mode: "Safe mode",
};

function StateStrip({ state }: { state: DeviceState }) {
  return (
    <ol className="strip" role="list" aria-label="Device state">
      {STEPS.map((s) => (
        <li
          key={s.key}
          role="listitem"
          className={`step ${s.key} ${s.key === state ? "on" : ""}`}
          aria-current={s.key === state ? "step" : undefined}
        >
          {s.label}
        </li>
      ))}
    </ol>
  );
}

function Sparkline({ frames, baseline }: { frames: Frame[]; baseline: number | null }) {
  const vals = frames.flatMap((f) => (f.hr != null ? [f.hr] : []));
  if (vals.length < 2) {
    return (
      <div className="spark" aria-hidden="true">
        <svg viewBox="0 0 300 72" preserveAspectRatio="none">
          <line x1="0" y1="36" x2="300" y2="36" className="spark-base" />
        </svg>
        <span className="spark-note">Collecting heart rate...</span>
      </div>
    );
  }
  const all = baseline != null ? [...vals, baseline] : vals;
  const mn = Math.min(...all), mx = Math.max(...all);
  const pad = (mx - mn || 10) * 0.1;
  const lo = mn - pad, hi = mx + pad;
  const n = frames.length;
  const X = (i: number) => (i / (n - 1)) * 300;
  const Y = (v: number) => 4 + (1 - (v - lo) / (hi - lo)) * 64;

  const segs: [number, number][][] = [];
  let cur: [number, number][] = [];
  frames.forEach((f, i) => {
    if (f.hr == null) { if (cur.length) segs.push(cur); cur = []; } else cur.push([X(i), Y(f.hr)]);
  });
  if (cur.length) segs.push(cur);
  const lastF = frames[n - 1];
  const dot = lastF.hr != null ? { x: X(n - 1), y: Y(lastF.hr) } : null;

  return (
    <div className="spark" aria-hidden="true">
      <svg viewBox="0 0 300 72" preserveAspectRatio="none">
        {baseline != null && <line x1="0" x2="300" y1={Y(baseline)} y2={Y(baseline)} className="spark-base" />}
        {segs.filter((s) => s.length > 1).map((s, i) => {
          const pts = s.map(([x, y]) => `${x},${y}`).join(" ");
          return (
            <g key={i}>
              <polyline points={pts} className="spark-line" />
            </g>
          );
        })}
      </svg>
      {dot && <span className="spark-dot" style={{ left: `${(dot.x / 300) * 100}%`, top: `${(dot.y / 72) * 100}%` }} />}
    </div>
  );
}

export function Hero({
  tel, frames, connected, linkKnown,
}: { tel: Telemetry | null; frames: Frame[]; connected: boolean; linkKnown: boolean }) {
  const down = linkKnown && !connected;
  if (!tel) {
    return (
      <div className="hero monitor" aria-busy="true">
        {down && <div className="callout warn" role="status">Device autonomous. Live link lost. The device keeps running safely on its own. No commands are sent.</div>}
        <div className="skel" style={{ height: 32, width: "55%" }} />
        <div className="skel" style={{ height: 72 }} />
        <div className="skel" style={{ height: 40 }} />
      </div>
    );
  }
  const delta = tel.hr != null && tel.hr_baseline != null ? Math.round(tel.hr - tel.hr_baseline) : null;
  const locked = tel.lock_reasons.length > 0 || tel.review_required;
  const s = tel.stim;
  return (
    <div className={`hero ${tel.state}`}>
      <span className="sr-only" aria-live="polite">Device state: {NAMES[tel.state]}</span>
      {down && <div className="callout warn" role="status">Device autonomous. Live link lost. The device keeps running safely on its own. No commands are sent.</div>}
      <div className={`hero-body ${down ? "dim" : ""}`}>
        <p className="hero-state" aria-hidden="true"><span className={`sdot ${tel.state}`} />{NAMES[tel.state]}</p>
        <div className="hr-row">
          <div className="hr">
            <span className="lbl">Heart rate</span>
            <div className="hr-val">
              <span className="hr-num">{tel.hr != null ? tel.hr.toFixed(0) : "--"}</span>
              <span className="hr-unit">bpm</span>
              {delta != null && (
                <span className="hr-delta" title={`Baseline ${tel.hr_baseline?.toFixed(0)} bpm`}>
                  {delta >= 0 ? "+" : ""}{delta} vs baseline
                </span>
              )}
            </div>
          </div>
          <Sparkline frames={frames} baseline={tel.hr_baseline} />
        </div>
        <StateStrip state={tel.state} />
        {locked && (
          <div className="callout danger" role="alert">
            <strong>{tel.review_required ? "Review required" : "Locked"}</strong>
            {tel.lock_reasons.length > 0 && <ul>{tel.lock_reasons.map((r) => <li key={r}>{r}</li>)}</ul>}
          </div>
        )}
        {tel.stimulating && s ? (
          <div className="stim-line">
            <dl className="kv">
              <div><dt className="lbl">Amplitude</dt><dd>{s.amp_mA.toFixed(1)} mA</dd></div>
              <div><dt className="lbl">Frequency</dt><dd>{s.freq_Hz} Hz</dd></div>
              <div><dt className="lbl">Pulse width</dt><dd>{s.pw_us} us</dd></div>
              <div><dt className="lbl">Duration</dt><dd>{s.duration_s} s</dd></div>
              <div><dt className="lbl">Site</dt><dd>{s.site}</dd></div>
              <div><dt className="lbl">Reason</dt><dd>{s.reason}</dd></div>
            </dl>
          </div>
        ) : (
          <p className="muted">No stimulation active.</p>
        )}
        <div className="foot">
          <div><span className="lbl">Sensor link</span>{down ? <b className="unk">Unknown</b> : <b className={tel.link_ok ? "ok" : "bad"}>{tel.link_ok ? "OK" : "Lost"}</b>}</div>
          <div><span className="lbl">Lost packets</span><b>{tel.lost}</b></div>
          <div><span className="lbl">Scenario</span><b>{tel.scenario || "none"}</b></div>
        </div>
      </div>
    </div>
  );
}
