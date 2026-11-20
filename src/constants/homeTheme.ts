export const HOME_THEME = {
  bg: '#181614',
  surface: '#221F1B',
  surface2: '#2B2722',
  border: '#3A352E',
  text: '#F4EFE6',
  textMuted: '#B3AA9A',
  primary: '#FFB400',
  onPrimary: '#1A1200',
  darkGreyGaps: '#2B2B2B',
  // 18% tints for puzzle illustration tiles
  tints: {
    '3x3': 'rgba(0, 81, 186, 0.18)',     // blue tint
    '2x2': 'rgba(0, 155, 72, 0.18)',     // green tint
    '4x4': 'rgba(196, 30, 58, 0.18)',     // red tint
    'pyraminx': 'rgba(255, 88, 0, 0.18)', // orange tint
  },
} as const;

export type HomeTheme = typeof HOME_THEME;

