import { PuzzleColor } from '../types/puzzle';
import { PALETTE } from '../components/3d/stickerLayout';

export { PALETTE };

export interface ColorScheme {
  hex: string;
  name: string;
  letter: string;
  contrastText: string;
}

export const STANDARD_COLORS: Record<PuzzleColor, ColorScheme> = {
  white: { hex: PALETTE.white, name: 'White', letter: 'W', contrastText: '#1A1A1A' },
  yellow: { hex: PALETTE.yellow, name: 'Yellow', letter: 'Y', contrastText: '#1A1A1A' },
  green: { hex: PALETTE.green, name: 'Green', letter: 'G', contrastText: '#FFFFFF' },
  blue: { hex: PALETTE.blue, name: 'Blue', letter: 'B', contrastText: '#FFFFFF' },
  red: { hex: PALETTE.red, name: 'Red', letter: 'R', contrastText: '#FFFFFF' },
  orange: { hex: PALETTE.orange, name: 'Orange', letter: 'O', contrastText: '#FFFFFF' },
};

// Color-blind friendly accessible palette (Okabe-Ito / Wong high-contrast palette)
export const COLORBLIND_COLORS: Record<PuzzleColor, ColorScheme> = {
  white: { hex: '#FFFFFF', name: 'White', letter: 'W', contrastText: '#1A1A1A' },
  yellow: { hex: '#F0E442', name: 'Yellow', letter: 'Y', contrastText: '#1A1A1A' },
  green: { hex: '#009E73', name: 'Green (Teal)', letter: 'G', contrastText: '#FFFFFF' },
  blue: { hex: '#0072B2', name: 'Blue', letter: 'B', contrastText: '#FFFFFF' },
  red: { hex: '#D55E00', name: 'Red (Vermilion)', letter: 'R', contrastText: '#FFFFFF' },
  orange: { hex: '#E69F00', name: 'Orange', letter: 'O', contrastText: '#1A1A1A' },
};

export const UI_COLORS = {
  dark: {
    bg: '#032B34',
    surface: 'rgba(6, 46, 58, 0.78)',
    surfaceHover: 'rgba(12, 64, 80, 0.88)',
    border: 'rgba(34, 211, 238, 0.28)',
    text: '#FFFFFF',
    textSecondary: '#A5F3FC',
    primary: '#22D3EE',
    primaryDark: '#0891B2',
    success: '#10B981',
    error: '#EF4444',
    warning: '#F59E0B',
    card: 'rgba(4, 45, 56, 0.72)',
  },
  light: {
    bg: '#032B34',
    surface: 'rgba(6, 46, 58, 0.78)',
    surfaceHover: 'rgba(12, 64, 80, 0.88)',
    border: 'rgba(34, 211, 238, 0.28)',
    text: '#FFFFFF',
    textSecondary: '#A5F3FC',
    primary: '#22D3EE',
    primaryDark: '#0891B2',
    success: '#10B981',
    error: '#EF4444',
    warning: '#F59E0B',
    card: 'rgba(4, 45, 56, 0.72)',
  },
};

