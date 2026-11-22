import { useState } from "react";
import type { DeviceEvent, EventKind, Telemetry } from "@/lib/api";

const KINDS: EventKind[] = ["candidate", "stim", "reject", "abort", "lock", "unlock", "safe_mode", "state"];
const DANGER = ["abort", "lock", "safe_mode", "reject"];
const fmt = (v: unknown) => (Array.isArray(v) ? v.join(", ") : String(v));

export function describe(e: DeviceEvent, tel: Telemetry | null): string {
  const d: Record<string, unknown> | null = typeof e.detail === "object" && e.detail ? e.detail : null;
  if (!d) return typeof e.detail === "string" && e.detail ? e.detail : e.kind;
  switch (e.kind) {
    case "stim": {
      let s = `Stimulation started (${fmt(d.reason)})`;
      const st = tel?.stim;
      if (st && String(st.cmd_id) === String(d.cmd_id)) s += `, ${st.amp_mA.toFixed(1)} mA, ${st.freq_Hz} Hz, ${st.duration_s} s`;
      return s;
    }
    case "candidate": return "Seizure candidate flagged";
    case "reject": return `${d.scheduled ? "Scheduled stimulation" : "Stimulation"} rejected: ${fmt(d.why)}`;
    case "abort": return `Stimulation aborted: ${fmt(d.cause)}`;
    case "lock": return `Device locked: ${fmt(d.reasons)}`;
    case "unlock": return "Device unlocked";
    case "safe_mode": return `Safe mode entered: ${fmt(d.cause)}`;
    case "state": return `State: ${fmt(d.frm)} to ${fmt(d.to)}`;
  }
  return Object.entries(d).map(([k, v]) => `${k}=${fmt(v)}`).join(" ") || e.kind;
}

function ago(dt: number) {
  if (dt < 1) return "just now";
  if (dt < 60) return `${Math.floor(dt)} s ago`;
  if (dt < 3600) return `${Math.floor(dt / 60)} min ago`;
  return `${Math.floor(dt / 3600)} h ago`;
}

export function EventFeed({
  events, tel, err,
}: { events: DeviceEvent[]; tel: Telemetry | null; err: boolean }) {
  const [filter, setFilter] = useState<EventKind | "all">("all");
  const [all, setAll] = useState(false);
  const now = Math.max(tel?.t ?? 0, ...events.map((e) => e.t));
  // keep original index as key so existing rows do not re-animate on poll
  const rows = events.map((e, i) => ({ e, i })).filter((r) => filter === "all" || r.e.kind === filter).reverse();
  const shown = all ? rows : rows.slice(0, 8);
  const opts = ["all", ...KINDS] as const;

  return (
    <>
      <div className="chips feed-chips" role="group" aria-label="Filter events by kind">
        {opts.map((k) => (
          <button key={k} className="chip" aria-pressed={filter === k} onClick={() => setFilter(k)}>{k.replace("_", " ")}</button>
        ))}
      </div>
      <select className="feed-select" aria-label="Filter events by kind" value={filter} onChange={(ev) => setFilter(ev.target.value as EventKind | "all")}>
        {opts.map((k) => <option key={k} value={k}>{k.replace("_", " ")}</option>)}
      </select>
      {err && <p className="err" role="alert">Event feed unavailable.</p>}
      {rows.length === 0 ? (
        <p className="muted">No events yet. Play a scenario to see activity.</p>
      ) : (
        <ol className="rail">
          {shown.map(({ e, i }) => (
            <li key={i} className="row">
              <time title={`t = ${e.t} s`}>{ago(now - e.t)}</time>
              <span className={`dot ${DANGER.includes(e.kind) ? "bad" : ""}`} aria-hidden="true" />
              <span className="row-txt">{describe(e, tel)}</span>
            </li>
          ))}
        </ol>
      )}
      {rows.length > 8 && (
        <button className="link-btn" onClick={() => setAll((v) => !v)} aria-expanded={all}>
          {all ? "Show fewer" : `Show all (${rows.length})`}
        </button>
      )}
    </>
  );
}
