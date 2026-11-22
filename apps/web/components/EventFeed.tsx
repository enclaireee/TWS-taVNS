import { useState } from "react";
import type { DeviceEvent, EventKind, Telemetry } from "@/lib/api";

const KINDS: EventKind[] = [
  "candidate",
  "stim",
  "reject",
  "abort",
  "lock",
  "unlock",
  "safe_mode",
  "state",
];

const LABELS: Record<EventKind, string> = {
  candidate: "Candidate",
  stim: "Stim",
  reject: "Reject",
  abort: "Abort",
  lock: "Lock",
  unlock: "Unlock",
  safe_mode: "Safe mode",
  state: "State",
};

const DANGER: EventKind[] = ["abort", "lock", "safe_mode", "reject"];

const fmt = (v: unknown) => (Array.isArray(v) ? v.join(", ") : String(v));

export function describe(e: DeviceEvent, tel: Telemetry | null): string {
  const d: Record<string, unknown> | null =
    typeof e.detail === "object" && e.detail ? e.detail : null;
  if (!d) return typeof e.detail === "string" && e.detail ? e.detail : e.kind;
  switch (e.kind) {
    case "stim": {
      let s = `Stimulation started (${fmt(d.reason)})`;
      const st = tel?.stim;
      if (st && String(st.cmd_id) === String(d.cmd_id)) {
        s += ` — ${st.amp_mA.toFixed(1)} mA, ${st.freq_Hz} Hz, ${st.duration_s} s`;
      }
      return s;
    }
    case "candidate":
      return "Seizure candidate flagged";
    case "reject":
      return `${d.scheduled ? "Scheduled stimulation" : "Stimulation"} rejected: ${fmt(d.why)}`;
    case "abort":
      return `Stimulation aborted: ${fmt(d.cause)}`;
    case "lock":
      return `Device locked: ${fmt(d.reasons)}`;
    case "unlock":
      return "Device unlocked";
    case "safe_mode":
      return `Safe mode entered: ${fmt(d.cause)}`;
    case "state":
      return `State changed from ${fmt(d.frm)} to ${fmt(d.to)}`;
  }
  return (
    Object.entries(d)
      .map(([k, v]) => `${k}=${fmt(v)}`)
      .join(" ") || e.kind
  );
}

function ago(dt: number) {
  if (dt < 1) return "just now";
  if (dt < 60) return `${Math.floor(dt)}s ago`;
  if (dt < 3600) return `${Math.floor(dt / 60)}m ago`;
  return `${Math.floor(dt / 3600)}h ago`;
}

function kindTone(kind: EventKind): string {
  if (DANGER.includes(kind)) return "bad";
  if (kind === "stim" || kind === "candidate") return "accent";
  if (kind === "unlock") return "ok";
  return "muted";
}

export function EventFeed({
  events,
  tel,
  err,
}: {
  events: DeviceEvent[];
  tel: Telemetry | null;
  err: boolean;
}) {
  const [filter, setFilter] = useState<EventKind | "all">("all");
  const [showAll, setShowAll] = useState(false);

  const now = Math.max(tel?.t ?? 0, ...events.map((e) => e.t));
  const counts: Partial<Record<EventKind, number>> = {};
  for (const e of events) counts[e.kind] = (counts[e.kind] ?? 0) + 1;

  const rows = events
    .map((e, i) => ({ e, i }))
    .filter((r) => filter === "all" || r.e.kind === filter)
    .reverse();

  const shown = showAll ? rows : rows.slice(0, 8);
  const opts = ["all", ...KINDS] as const;

  return (
    <>
      <div className="filter-row" role="group" aria-label="Filter events by type">
        {opts.map((k) => {
          const count = k === "all" ? events.length : (counts[k] ?? 0);
          return (
            <button
              key={k}
              className="filter-chip"
              aria-pressed={filter === k}
              onClick={() => setFilter(k)}
            >
              <span>{k === "all" ? "All" : LABELS[k]}</span>
              {count > 0 && <span style={{ opacity: 0.7 }}>{count}</span>}
            </button>
          );
        })}
      </div>

      {err && (
        <p className="err-inline" role="alert">
          Event feed unavailable.
        </p>
      )}

      {rows.length === 0 ? (
        <p className="tl-empty">
          No events recorded yet. Trigger a live event above or play a verification scenario.
        </p>
      ) : (
        <ol className="log-list">
          {shown.map(({ e, i }) => (
            <li key={i} className={`log-item ${kindTone(e.kind)}`}>
              <span className={`log-kind ${kindTone(e.kind)}`}>
                {LABELS[e.kind] ?? e.kind}
              </span>
              <span className="tl-text">{describe(e, tel)}</span>
              <time className="tl-time" title={`t = ${e.t.toFixed(1)} s`}>
                {ago(Math.max(0, now - e.t))}
              </time>
            </li>
          ))}
        </ol>
      )}

      {rows.length > 8 && (
        <button
          className="text-link"
          onClick={() => setShowAll((v) => !v)}
          aria-expanded={showAll}
        >
          {showAll ? "Show fewer" : `View all ${rows.length} events`}
        </button>
      )}
    </>
  );
}
