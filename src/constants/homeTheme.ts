export const HOME_THEME = {
  bg: '#181614',
  surface: 'rgba(6, 46, 58, 0.78)',
  surface2: 'rgba(12, 64, 80, 0.88)',
  border: 'rgba(34, 211, 238, 0.28)',
  text: '#FFFFFF',
  textMuted: '#A5F3FC',
  primary: '#22D3EE',
  onPrimary: '#02242C',
  darkGreyGaps: 'rgba(2, 36, 44, 0.85)',
  // 18% tints for puzzle illustration tiles
  tints: {
    '3x3': 'rgba(34, 211, 238, 0.22)',     // cyan tint
    '2x2': 'rgba(16, 185, 129, 0.22)',     // emerald tint
    '4x4': 'rgba(239, 68, 68, 0.22)',      // red tint
    'pyraminx': 'rgba(245, 158, 11, 0.22)', // amber tint
  },
} as const;

export type HomeTheme = typeof HOME_THEME;

