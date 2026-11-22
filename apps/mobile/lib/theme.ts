import type { TextStyle } from 'react-native';

/**
 * taVNS Mobile Design System — Machined Obsidian
 * Synchronized with apps/web/app/globals.css & docs/tokens.json
 */
export const color = {
  bg: '#070709',
  stage: '#101014',
  well: '#0B0B0E',
  track: '#0A0A0D',
  stage2: '#16161C',
  stage3: '#1E1E26',
  stageHover: '#1B1B23',

  line: 'rgba(255, 255, 255, 0.085)',
  lineSoft: 'rgba(255, 255, 255, 0.055)',
  lineStrong: 'rgba(255, 255, 255, 0.16)',
  sheen: 'rgba(255, 255, 255, 0.08)',

  ink: '#F5F5F8',
  ink2: '#C9C9D4',
  muted: '#8A8A98',
  faint: '#5C5C6B',

  // Restrained Satin Purple Accent (~5% visual weight)
  accent: '#9B82F6',
  accentSoft: 'rgba(155, 130, 246, 0.14)',
  accentLine: 'rgba(155, 130, 246, 0.42)',
  plumFill: '#27203F',
  plumStroke: '#544485',

  // Clinical Functional Signals
  green: '#38C980',
  greenSoft: 'rgba(56, 201, 128, 0.11)',
  greenLine: 'rgba(56, 201, 128, 0.26)',

  amber: '#E8A838',
  amberSoft: 'rgba(232, 168, 56, 0.12)',
  amberLine: 'rgba(232, 168, 56, 0.30)',

  red: '#F05259',
  redHover: '#D83E45',
  redSoft: 'rgba(240, 82, 89, 0.12)',
  redLine: 'rgba(240, 82, 89, 0.34)',
} as const;

export const radius = {
  stage: 20,
  panel: 14,
  tile: 11,
  btn: 9,
  chip: 8,
  pill: 999,
} as const;

export const space = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 22,
} as const;

export const font = {
  xs: 11,
  sm: 12,
  md: 13.5,
  base: 14.5,
  lg: 17,
  xl: 26,
  display: 44,
} as const;

export const tabular: TextStyle = {
  fontVariant: ['tabular-nums'],
};

export const shadow = {
  stage: {
    shadowColor: '#000000',
    shadowOpacity: 0.45,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 10,
  },
  bar: {
    shadowColor: '#000000',
    shadowOpacity: 0.6,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: -4 },
    elevation: 16,
  },
};

export type DeviceState = 'monitor' | 'stim' | 'cooldown' | 'locked' | 'safe_mode';

export const STATE_META: Record<
  DeviceState,
  {
    label: string;
    short: string;
    note: string;
    fg: string;
    bg: string;
    border: string;
  }
> = {
  monitor: {
    label: 'Monitoring',
    short: 'Monitor',
    note: 'Tracking continuous PPG pulse, auricular EEG, and IMU motion; seizure detector armed.',
    fg: color.green,
    bg: color.greenSoft,
    border: color.greenLine,
  },
  stim: {
    label: 'Stimulating',
    short: 'Stim',
    note: 'Seizure confirmed — delivering charge-balanced biphasic taVNS pulses at cymba conchae.',
    fg: color.accent,
    bg: color.accentSoft,
    border: color.accentLine,
  },
  cooldown: {
    label: 'Cooldown',
    short: 'Cooldown',
    note: 'Post-stimulation refractory window active; repeat stimulation triggers suppressed.',
    fg: color.amber,
    bg: color.amberSoft,
    border: color.amberLine,
  },
  locked: {
    label: 'Safety locked',
    short: 'Locked',
    note: 'Safety gate blocked stimulation to protect against physiological or hardware hazards.',
    fg: color.red,
    bg: color.redSoft,
    border: color.redLine,
  },
  safe_mode: {
    label: 'Safe mode',
    short: 'Safe',
    note: 'Sensor transport degraded; stimulator output stage isolated until link recovers.',
    fg: color.red,
    bg: color.redSoft,
    border: color.redLine,
  },
};

// Hard limits (firmware-enforced): never display controls beyond these.
// impMaxKohm matches GateConfig.impedance_max_kohm in tws/safety/gate.py (docs/research, sec. 5.6).
export const LIMITS = {
  ampMax: 5.0,
  pwMax: 500,
  fMin: 1,
  fMax: 30,
  impMaxKohm: 40,
} as const;
