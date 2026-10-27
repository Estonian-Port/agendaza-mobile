export const Colors = {
  primary: '#0d6efd',
  secondary: 'dodgerblue',
  tertiary: 'whitesmoke',
  text: '#666666',
  textDark: '#363636',
  textSoft: '#555555',
  white: '#ffffff',
  black: '#000000',
  danger: '#dc3545',
  success: '#198754',
  successLight: '#22c55e',
  warning: '#f59e0b',
  cardShadow: 'rgba(0, 0, 0, 0.1)',
  cardShadowSoft: 'rgba(0,0,0,0.06)',
  borderSoft: 'rgba(0,0,0,0.08)',
  neutralBg: '#f8f9fa',
  neutralInput: '#e9ecef',
  neutralText: '#495057',
  neutralBorder: '#dee2e6',
  disabledBg: '#f0f0f0',
  disabledText: '#a0a0a0',
  overlay: 'rgba(255, 255, 255, 0.5)',
} as const;

export const Radius = {
  card: 16,
  cardLg: 24,
  panel: 10,
  pill: 999,
  button: 8,
  input: 10,
  badge: 8,
} as const;

export const Shadow = {
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  cardLg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 5,
  },
  soft: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
} as const;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const Typography = {
  hero: { fontSize: 34, fontWeight: '700' as const },
  title: { fontSize: 24, fontWeight: '700' as const },
  subtitle: { fontSize: 20, fontWeight: '600' as const },
  heading: { fontSize: 17, fontWeight: '600' as const },
  body: { fontSize: 15, fontWeight: '400' as const },
  caption: { fontSize: 13, fontWeight: '400' as const },
  micro: { fontSize: 11, fontWeight: '500' as const },
} as const;
