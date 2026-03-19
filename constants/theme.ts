import { Platform } from 'react-native';

const tintColorLight = '#0a7ea4';
const tintColorDark = '#fff';

export const Colors = {
  light: {
    text: '#11181C',
    background: '#fff',
    tint: tintColorLight,
    icon: '#687076',
    tabIconDefault: '#687076',
    tabIconSelected: tintColorLight,
  },
  dark: {
    text: '#ECEDEE',
    background: '#151718',
    tint: tintColorDark,
    icon: '#9BA1A6',
    tabIconDefault: '#9BA1A6',
    tabIconSelected: tintColorDark,
  },
};

export const AppPalette = {
  light: {
    card: '#0d2340',
    primary: '#3A7CFF',
    danger: '#D64545',
    secondary: '#2D2F3E',
    textLight: '#FFFFFF',
    textSubtle: '#C7CBDA',
    textDark: '#0d2340',
    accent: '#4ADE80',
    navMicIdle: '#DDDDDD',
    navMicActive: '#FFCCCC',
    navDivider: '#CCCCCC',
  },
  dark: {
    card: '#1B2434',
    primary: '#4A8CFF',
    danger: '#E25B5B',
    secondary: '#2A3140',
    textLight: '#FFFFFF',
    textSubtle: '#B9C2D8',
    textDark: '#ECEDEE',
    accent: '#52E38A',
    navMicIdle: '#2B2F38',
    navMicActive: '#5C2C33',
    navDivider: '#3C4452',
  },
} as const;

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
