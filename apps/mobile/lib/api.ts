// Only ABORT, clear_review and scenario playback are ever sent. No stimulation commands, no queueing.
export type Stim = { amp_mA: number; freq_Hz: number; pw_us: number; duration_s: number; site: string; reason: string; cmd_id: string | number };
export type Telemetry = {
  t: number; state: 'monitor' | 'stim' | 'cooldown' | 'locked' | 'safe_mode';
  hr: number | null; hr_baseline: number | null; link_ok: boolean; lost: number;
  lock_reasons: string[]; review_required: boolean; stimulating: boolean; stim: Stim | null;
  scenario: string; done: boolean; speed: number;
};
export type EventItem = { t: number; kind: string; detail: string };
export type Scenario = { key: string; title: string };

const clean = (u: string) => u.trim().replace(/\/+$/, '');

async function req<T>(base: string, path: string, method = 'GET'): Promise<T> {
  const r = await fetch(clean(base) + path, { method, headers: { 'X-TWS-Client': '1' } });
  if (!r.ok) throw new Error(`${method} ${path} ${r.status}`);
  return r.json() as Promise<T>;
}

export const getEvents = (b: string) => req<EventItem[]>(b, '/events');
export const getScenarios = (b: string) => req<Scenario[]>(b, '/scenarios');
export const startScenario = (b: string, key: string, speed = 10) =>
  req<Telemetry>(b, `/scenario/${encodeURIComponent(key)}?speed=${speed}`, 'POST');
export const abort = (b: string) => req<unknown>(b, '/abort', 'POST');
export const clearReview = (b: string) => req<unknown>(b, '/clear_review', 'POST');

/** WS client with auto-reconnect (1.5 s). Returns a close function. */
export function connectWs(base: string, onMsg: (t: Telemetry) => void, onStatus: (up: boolean) => void) {
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
    ws.onmessage = (e) => { try { onMsg(JSON.parse(String(e.data))); } catch { /* ignore bad frame */ } };
    ws.onclose = () => { onStatus(false); if (!closed) timer = setTimeout(open, 1500); };
    ws.onerror = () => ws?.close();
  };
  open();
  return () => { closed = true; clearTimeout(timer); if (ws) { ws.onclose = null; ws.close(); } onStatus(false); };
}
