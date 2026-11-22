import { create } from 'zustand';
import * as api from './api';
import type { Telemetry } from './api';

export type Tab = 'Live' | 'Events' | 'Therapy' | 'Device' | 'Demo';

type S = {
  baseUrl: string;
  connected: boolean;
  tel: Telemetry | null;
  tab: Tab;
  setTab: (t: Tab) => void;
  setBaseUrl: (u: string) => void;
  connect: () => void;
  abort: () => Promise<void>;
  clearReview: () => Promise<void>;
};

let close: (() => void) | null = null;

export const useStore = create<S>((set, get) => ({
  baseUrl: 'http://localhost:8000',
  connected: false,
  tel: null,
  tab: 'Live',
  setTab: (tab) => set({ tab }),
  setBaseUrl: (baseUrl) => { set({ baseUrl }); get().connect(); },
  connect: () => {
    close?.();
    close = api.connectWs(get().baseUrl, (tel) => set({ tel }), (connected) => set({ connected }));
  },
  abort: async () => { await api.abort(get().baseUrl).catch(() => {}); },
  clearReview: async () => { await api.clearReview(get().baseUrl).catch(() => {}); },
}));
