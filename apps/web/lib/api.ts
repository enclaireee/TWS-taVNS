// Types match docs/api.md
export const API = process.env.NEXT_PUBLIC_API ?? "http://localhost:8000";
export const WS_URL = API.replace(/^http/, "ws") + "/ws";

export type DeviceState = "monitor" | "stim" | "cooldown" | "locked" | "safe_mode";
export type Stim = {
  amp_mA: number; freq_Hz: number; pw_us: number; duration_s: number;
  site: string; reason: string; cmd_id: string | number;
};
export type Telemetry = {
  t: number; state: DeviceState; hr: number | null; hr_baseline: number | null;
  link_ok: boolean; lost: number; lock_reasons: string[]; review_required: boolean;
  stimulating: boolean; stim: Stim | null; scenario: string; done: boolean; speed: number;
};
export type EventKind = "candidate" | "stim" | "reject" | "abort" | "lock" | "unlock" | "safe_mode" | "state";
export type DeviceEvent = { t: number; kind: EventKind; detail: string | Record<string, unknown> };
export type Scenario = { key: string; title: string };
export type Result = { key: string; title: string; pass: boolean };

async function req<T>(path: string, method = "GET"): Promise<T> {
  const r = await fetch(API + path, { method, headers: { "X-TWS-Client": "1" } });
  if (!r.ok) throw new Error(`${method} ${path} -> ${r.status}`);
  return r.json();
}

export const getState = () => req<Telemetry>("/state");
export const getEvents = () => req<DeviceEvent[]>("/events");
export const getScenarios = () => req<Scenario[]>("/scenarios");
export const getResults = () => req<Result[]>("/results");
export const playScenario = (key: string, speed = 10) =>
  req<Telemetry>(`/scenario/${encodeURIComponent(key)}?speed=${speed}`, "POST");
export const abort = () => req<unknown>("/abort", "POST");

// Only receives telemetry; never sends anything over the socket.
export function connectTelemetry(
  onMsg: (t: Telemetry) => void,
  onStatus: (connected: boolean) => void,
): () => void {
  let ws: WebSocket | null = null;
  let timer: ReturnType<typeof setTimeout>;
  let closed = false;
  const open = () => {
    ws = new WebSocket(WS_URL);
    ws.onopen = () => onStatus(true);
    ws.onmessage = (e) => { try { onMsg(JSON.parse(e.data)); } catch { /* ignore bad frame */ } };
    ws.onclose = () => { onStatus(false); if (!closed) timer = setTimeout(open, 2000); };
    ws.onerror = () => ws?.close();
  };
  open();
  return () => { closed = true; clearTimeout(timer); ws?.close(); };
}
