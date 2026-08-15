// ─────────────────────────────────────────────
//  NP_BRANDING  ·  Luxury Fashion Palette
// ─────────────────────────────────────────────

export const colors = {
  // Primary palette — Charcoal / Black
  primary: '#1A1A1A',
  primaryDark: '#000000',
  secondary: '#2D2D2D',

  // Accent — Dusty Rose
  accent: '#C9A99A',

  // Backgrounds — Ivory family
  background: '#FAF9F7',
  surface: '#FFFFFF',
  surfaceHover: '#F5F0EB',

  // Text
  text: '#1A1A1A',
  textSecondary: '#8A8177',

  // Borders — warm neutral
  border: '#E8E2DA',

  // Semantic
  error: '#B5604A',
  success: '#7A9E7E',
  warning: '#C4A35A',
  info: '#7A8FA0',

  // Feature colours
  laser: '#C9A99A',    // dusty rose scanner laser
  sold: '#8A7B9B',     // muted mauve for sold count
};

export const darkColors = {
  // Primary palette — Ivory / Off-white
  primary: '#F5F0EB',
  primaryDark: '#E8E2DA',
  secondary: '#D4C8BC',

  // Accent — Dusty Rose (same in both modes)
  accent: '#C9A99A',

  // Backgrounds — Near-black charcoal family
  background: '#0D0D0D',
  surface: '#1A1A1A',
  surfaceHover: '#242424',

  // Text
  text: '#F5F0EB',
  textSecondary: '#9E9589',

  // Borders — warm dark
  border: '#2D2D2D',

  // Semantic
  error: '#D4836B',
  success: '#7A9E7E',
  warning: '#C4A35A',
  info: '#7A8FA0',

  // Feature colours
  laser: '#C9A99A',
  sold: '#A89BB5',
};

export const spacing = {
  xs: 4,
  s: 8,
  m: 16,
  l: 24,
  xl: 32,
  xxl: 48,
};

export const typography = {
  // Editorial headings — wide tracking, strong weight
  h1: {
    fontSize: 28,
    fontWeight: '700' as const,
    letterSpacing: 0.5,
    lineHeight: 34,
  },
  h2: {
    fontSize: 22,
    fontWeight: '700' as const,
    letterSpacing: 0.3,
    lineHeight: 28,
  },
  h3: {
    fontSize: 17,
    fontWeight: '600' as const,
    letterSpacing: 0.2,
    lineHeight: 23,
  },
  // Label style — uppercase feel
  label: {
    fontSize: 10,
    fontWeight: '700' as const,
    letterSpacing: 2,
    lineHeight: 14,
    textTransform: 'uppercase' as const,
  },
  body1: {
    fontSize: 15,
    fontWeight: '400' as const,
    lineHeight: 22,
    letterSpacing: 0.1,
  },
  body2: {
    fontSize: 13,
    fontWeight: '400' as const,
    lineHeight: 19,
    letterSpacing: 0.1,
  },
  caption: {
    fontSize: 12,
    fontWeight: '500' as const,
    lineHeight: 16,
    letterSpacing: 0.2,
  },
  micro: {
    fontSize: 10,
    fontWeight: '600' as const,
    letterSpacing: 1,
  },
};

export const shadows = {
  none: {},
  soft: {
    shadowColor: '#1A1A1A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  medium: {
    shadowColor: '#1A1A1A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 14,
    elevation: 3,
  },
  glow: {
    // Fashion accent shadow — subtle dusty rose
    shadowColor: '#C9A99A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
  },
};

export const borderRadius = {
  xs: 3,
  s: 6,
  m: 10,
  l: 16,
  xl: 24,
  round: 9999,
};
