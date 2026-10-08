/** Static design tokens — never change between themes */
export const radius = {
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  pill: 999,
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const typography = {
  regular:   'Manrope_400Regular',
  semiBold:  'Manrope_600SemiBold',
  bold:      'Manrope_700Bold',
  extraBold: 'Manrope_800ExtraBold',
};

/** Color palettes — swap between these based on user preference */
export interface ColorTokens {
  background: string;
  surface:    string;
  dark:       string;   // primary text / active elements
  primary:    string;   // lime green accent
  text:       string;
  textMuted:  string;
  border:     string;
  error:      string;
  // convenience alias used in some components
  surface2:   string;   // slightly different surface for nesting
}

export const lightColors: ColorTokens = {
  background: '#F3F3F3',
  surface:    '#E9EEEA',
  surface2:   '#DDDFE0',
  dark:       '#1A1C1E',
  primary:    '#E4F874',
  text:       '#1A1C1E',
  textMuted:  '#8D929A',
  border:     '#D8DBE0',
  error:      '#FF3B30',
};

export const darkColors: ColorTokens = {
  background: '#111214',
  surface:    '#1E2124',
  surface2:   '#2A2D31',
  dark:       '#ECEEF0',
  primary:    '#E4F874',
  text:       '#ECEEF0',
  textMuted:  '#6B7280',
  border:     '#2E3136',
  error:      '#FF453A',
};

/** Legacy export — kept so any file that hasn't been updated yet still compiles */
export const theme = {
  colors: lightColors,
  radius,
  spacing,
  typography,
};
