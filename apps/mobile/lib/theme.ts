// Values duplicated from ../design/tokens.json (Metro does not bundle files outside app/).
export const color = {
  bg: '#F4F0FB', card: '#FFFFFF', ink: '#2A1B4D', muted: '#7A6C9B',
  purple900: '#3A1F7A', purple700: '#4B2A8F', purple500: '#7F52D6', purple300: '#B58CF0', purple100: '#E9DEFB',
  danger: '#E5384F', dangerBg: '#FDE8EB', ok: '#2FA67A', warn: '#E8A33D', line: '#DCCFF3',
};
export const gradient = ['#4B2A8F', '#B58CF0'] as const;
export const radius = { card: 20, pill: 999, chip: 12 };
export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 };
export const font = { sm: 12, md: 14, lg: 18, xl: 28 };
export const shadow = {
  card: { shadowColor: '#4B2A8F', shadowOpacity: 0.14, shadowRadius: 20, shadowOffset: { width: 0, height: 6 }, elevation: 6 },
  soft: { shadowColor: '#4B2A8F', shadowOpacity: 0.1, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
};
// Hard limits (device-enforced): never display beyond these.
export const LIMITS = { ampMax: 5, pwMax: 500, fMin: 1, fMax: 30 };
