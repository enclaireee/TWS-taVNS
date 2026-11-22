import type { DeviceState } from './theme';

// Only ABORT, clear_review, live injections, and scenario playback are ever sent.
// No direct stimulation commands, no queueing.
export type LiveInjection =
  | 'seizure'
  | 'hr_drop'
  | 'fall'
  | 'chewing'
  | 'electrode_off'
  | 'drop_link'
  | 'normal';

export type Stim = {
  amp_mA: number;
  freq_Hz: number;
  pw_us: number;
  duration_s: number;
  site: string;
  reason: string;
  cmd_id: string | number;
};

export type Telemetry = {
  t: number;
  state: DeviceState;
  hr: number | null;
  hr_baseline: number | null;
  link_ok: boolean;
  lost: number;
  lock_reasons: string[];
  review_required: boolean;
  stimulating: boolean;
  stim: Stim | null;
  scenario: string;
  done: boolean;
  speed: number;
  live_mode?: boolean;
  injections?: string[];
  ppg?: number[];
  eeg?: number[];
  imu_g?: number | null;
  impedance_kohm?: number | null;
};

export type EventKind =
  | 'candidate'
  | 'stim'
  | 'reject'
  | 'abort'
  | 'lock'
  | 'unlock'
  | 'safe_mode'
  | 'state';

export type DeviceEvent = {
  t: number;
  kind: EventKind;
  detail: string | Record<string, unknown>;
};

export type Scenario = { key: string; title: string };
export type Result = { key: string; title: string; pass: boolean };

const clean = (u: string) => u.trim().replace(/\/+$/, '');

async function req<T>(base: string, path: string, method = 'GET'): Promise<T> {
  const r = await fetch(clean(base) + path, {
    method,
    headers: { 'X-TWS-Client': '1' },
  });
  if (!r.ok) throw new Error(`${method} ${path} -> ${r.status}`);
  return r.json() as Promise<T>;
}

export const getState = (b: string) => req<Telemetry>(b, '/state');
export const getEvents = (b: string) => req<DeviceEvent[]>(b, '/events');
export const getScenarios = (b: string) => req<Scenario[]>(b, '/scenarios');
export const getResults = (b: string) => req<Result[]>(b, '/results');
export const startScenario = (b: string, key: string, speed = 10) =>
  req<Telemetry>(b, `/scenario/${encodeURIComponent(key)}?speed=${speed}`, 'POST');
export const startLive = (b: string, speed = 2) =>
  req<Telemetry>(b, `/live?speed=${speed}`, 'POST');
export const injectLive = (b: string, kind: LiveInjection) =>
  req<Telemetry>(b, `/live/inject/${encodeURIComponent(kind)}`, 'POST');
export const abort = (b: string) => req<Telemetry>(b, '/abort', 'POST');
export const clearReview = (b: string) => req<Telemetry>(b, '/clear_review', 'POST');

/** WS client with auto-reconnect (1.5 s). Returns a close function. */
export function connectWs(
  base: string,
  onMsg: (t: Telemetry) => void,
  onStatus: (up: boolean) => void,
) {
  let ws: WebSocket | null = null;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let closed = false;

  const open = () => {
    try {
      ws = new WebSocket(clean(base).replace(/^http/, 'ws') + '/ws');
    } catch {
      onStatus(false);
      timer = setTimeout(open, 1500);
      return;
    }
    ws.onopen = () => onStatus(true);
    ws.onmessage = (e) => {
      try {
        onMsg(JSON.parse(String(e.data)));
      } catch {
        /* ignore malformed frame */
      }
    };
    ws.onclose = () => {
      onStatus(false);
      if (!closed) timer = setTimeout(open, 1500);
    };
    ws.onerror = () => ws?.close();
  };

  open();
  return () => {
    closed = true;
    clearTimeout(timer);
    if (ws) {
      ws.onclose = null;
      ws.close();
    }
    onStatus(false);
  };
}

const fmtVal = (v: unknown): string => (Array.isArray(v) ? v.join(', ') : String(v));

export function describeEvent(e: DeviceEvent, tel: Telemetry | null): string {
  const d: Record<string, unknown> | null =
    typeof e.detail === 'object' && e.detail !== null ? e.detail : null;
  if (!d) return typeof e.detail === 'string' && e.detail ? e.detail : e.kind;

  switch (e.kind) {
    case 'stim': {
      let s = `Stimulation started (${fmtVal(d.reason)})`;
      const st = tel?.stim;
      if (st && String(st.cmd_id) === String(d.cmd_id)) {
        s += ` — ${st.amp_mA.toFixed(1)} mA, ${st.freq_Hz} Hz, ${st.duration_s} s`;
      }
      return s;
    }
    case 'candidate':
      return 'Seizure candidate flagged by DSP';
    case 'reject':
      return `${d.scheduled ? 'Scheduled stimulation' : 'Stimulation'} rejected: ${fmtVal(d.why)}`;
    case 'abort':
      return `Stimulation aborted: ${fmtVal(d.cause)}`;
    case 'lock':
      return `Safety lock engaged: ${fmtVal(d.reasons)}`;
    case 'unlock':
      return 'Safety lock cleared — device unlocked';
    case 'safe_mode':
      return `Safe mode entered: ${fmtVal(d.cause)}`;
    case 'state':
      return `State transition: ${fmtVal(d.frm)} → ${fmtVal(d.to)}`;
    default:
      return (
        Object.entries(d)
          .map(([k, v]) => `${k}=${fmtVal(v)}`)
          .join(' · ') || e.kind
      );
  }
}

export function formatClock(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function formatAgo(dt: number): string {
  if (dt < 1) return 'just now';
  if (dt < 60) return `${Math.floor(dt)}s ago`;
  if (dt < 3600) return `${Math.floor(dt / 60)}m ago`;
  return `${Math.floor(dt / 3600)}h ago`;
}

export function splitScenarioTitle(title: string): [string, string | null] {
  const idx = title.indexOf(':');
  if (idx === -1) return [title, null];
  return [title.slice(0, idx).trim(), title.slice(idx + 1).trim()];
}
