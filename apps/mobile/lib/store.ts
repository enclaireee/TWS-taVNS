import { Platform } from 'react-native';
import { create } from 'zustand';
import * as api from './api';
import type { DeviceEvent, LiveInjection, Result, Scenario, Telemetry } from './api';

export type Tab = 'Live' | 'Events' | 'Therapy' | 'Demo' | 'Device';

const VALID_TABS: Tab[] = ['Live', 'Events', 'Therapy', 'Demo', 'Device'];

function getInitialTab(): Tab {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    const q = new URLSearchParams(window.location.search).get('tab');
    if (q && VALID_TABS.includes(q as Tab)) return q as Tab;
  }
  return 'Live';
}

type Store = {
  baseUrl: string;
  connected: boolean;
  linkKnown: boolean;
  tel: Telemetry | null;
  ppgWave: number[];
  eegWave: number[];
  events: DeviceEvent[];
  eventsErr: boolean;
  scenarios: Scenario[];
  results: Result[] | null;
  runningResults: boolean;
  speed: number;
  tab: Tab;
  actionMsg: string;

  setTab: (t: Tab) => void;
  setSpeed: (sp: number) => void;
  setBaseUrl: (u: string) => void;
  clearMsg: () => void;
  connect: () => void;
  refreshEvents: () => Promise<void>;
  refreshScenarios: () => Promise<void>;
  abort: () => Promise<void>;
  clearReview: () => Promise<void>;
  injectLive: (kind: LiveInjection) => Promise<void>;
  startLive: () => Promise<void>;
  playScenario: (key: string) => Promise<void>;
  runAllResults: () => Promise<void>;
};

let closeWs: (() => void) | null = null;
let flushTimer: ReturnType<typeof setInterval> | null = null;
let lastT = -1;
let ppgBuf: number[] = [];
let eegBuf: number[] = [];
let latestTel: Telemetry | null = null;
let dirty = false;

function ingestTelemetry(t: Telemetry) {
  if (lastT >= 0 && t.t < lastT) {
    ppgBuf = [];
    eegBuf = [];
  }
  lastT = t.t;

  if (t.ppg && t.ppg.length > 0) {
    const chunk = ppgBuf.length === 0 ? t.ppg : t.ppg.slice(-12);
    ppgBuf = [...ppgBuf, ...chunk].slice(-108);
  } else if (!t.link_ok) {
    ppgBuf = [];
  }

  if (t.eeg && t.eeg.length > 0) {
    const chunk = eegBuf.length === 0 ? t.eeg : t.eeg.slice(-12);
    eegBuf = [...eegBuf, ...chunk].slice(-108);
  } else if (!t.link_ok) {
    eegBuf = [];
  }

  latestTel = t;
  dirty = true;
}

export const useStore = create<Store>((set, get) => ({
  baseUrl: 'http://localhost:8000',
  connected: false,
  linkKnown: false,
  tel: null,
  ppgWave: [],
  eegWave: [],
  events: [],
  eventsErr: false,
  scenarios: [],
  results: null,
  runningResults: false,
  speed: 10,
  tab: getInitialTab(),
  actionMsg: '',

  setTab: (tab) => set({ tab }),
  setSpeed: (speed) => set({ speed }),
  clearMsg: () => set({ actionMsg: '' }),

  setBaseUrl: (baseUrl) => {
    set({ baseUrl, actionMsg: '' });
    get().connect();
  },

  connect: () => {
    closeWs?.();
    if (flushTimer) clearInterval(flushTimer);
    ppgBuf = [];
    eegBuf = [];
    lastT = -1;
    latestTel = null;

    const base = get().baseUrl;

    api
      .getState(base)
      .then((t) => {
        if (!latestTel) {
          ingestTelemetry(t);
          set({ tel: t, ppgWave: ppgBuf.slice(), eegWave: eegBuf.slice() });
        }
      })
      .catch(() => {});

    closeWs = api.connectWs(
      base,
      (t) => ingestTelemetry(t),
      (connected) => set({ connected, linkKnown: true }),
    );

    flushTimer = setInterval(() => {
      if (!dirty || !latestTel) return;
      dirty = false;
      set({
        tel: latestTel,
        ppgWave: ppgBuf.slice(),
        eegWave: eegBuf.slice(),
      });
    }, 140);

    get().refreshEvents();
    get().refreshScenarios();
  },

  refreshEvents: async () => {
    try {
      const events = await api.getEvents(get().baseUrl);
      set({ events, eventsErr: false });
    } catch {
      set({ eventsErr: true });
    }
  },

  refreshScenarios: async () => {
    try {
      const scenarios = await api.getScenarios(get().baseUrl);
      set({ scenarios });
    } catch {
      /* handled by link status */
    }
  },

  abort: async () => {
    try {
      const next = await api.abort(get().baseUrl);
      ingestTelemetry(next);
      set({ tel: next, actionMsg: '' });
      get().refreshEvents();
    } catch {
      set({ actionMsg: 'Abort failed — check connection to core.' });
    }
  },

  clearReview: async () => {
    try {
      const next = await api.clearReview(get().baseUrl);
      ingestTelemetry(next);
      set({ tel: next, actionMsg: '' });
      get().refreshEvents();
    } catch {
      set({ actionMsg: 'Could not clear manual review.' });
    }
  },

  injectLive: async (kind) => {
    try {
      const next = await api.injectLive(get().baseUrl, kind);
      ingestTelemetry(next);
      set({ tel: next, actionMsg: '' });
      get().refreshEvents();
    } catch (err) {
      const msg =
        err instanceof Error && err.message.includes('409')
          ? 'Review required: clear manual review before triggering live events.'
          : 'Could not trigger live event.';
      set({ actionMsg: msg });
    }
  },

  startLive: async () => {
    try {
      ppgBuf = [];
      eegBuf = [];
      const next = await api.startLive(get().baseUrl, 2);
      ingestTelemetry(next);
      set({ tel: next, ppgWave: ppgBuf.slice(), eegWave: eegBuf.slice(), actionMsg: '' });
      get().refreshEvents();
    } catch (err) {
      const msg =
        err instanceof Error && err.message.includes('409')
          ? 'Review required: clear manual review before resetting live stream.'
          : 'Could not start live human stream.';
      set({ actionMsg: msg });
    }
  },

  playScenario: async (key) => {
    try {
      ppgBuf = [];
      eegBuf = [];
      const next = await api.startScenario(get().baseUrl, key, get().speed);
      ingestTelemetry(next);
      set({ tel: next, actionMsg: '' });
      get().refreshEvents();
    } catch (err) {
      const msg =
        err instanceof Error && err.message.includes('409')
          ? 'Review required: clear manual review before playing a scenario.'
          : 'Could not start scenario playback.';
      set({ actionMsg: msg });
    }
  },

  runAllResults: async () => {
    set({ runningResults: true, actionMsg: '' });
    try {
      const results = await api.getResults(get().baseUrl);
      set({ results, runningResults: false });
    } catch {
      set({ runningResults: false, actionMsg: 'Could not run verification suite.' });
    }
  },
}));
