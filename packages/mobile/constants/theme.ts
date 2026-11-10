import { Platform } from "react-native";

/**
 * Tokens de cor da FAM Metal. Mesmos nomes do web (packages/web/src/web/styles.css).
 * Verde escuro #125f3d e verde claro #9acd4f.
 */
export const Colors = {
  light: {
    background: "#F7F7F7",
    foreground: "#1B2A22",
    card: "#FFFFFF",
    cardForeground: "#1B2A22",
    primary: "#125f3d",
    primaryForeground: "#FFFFFF",
    secondary: "#9acd4f",
    secondaryForeground: "#1B2A22",
    muted: "#EEF2EF",
    mutedForeground: "#5B6B62",
    accent: "#E6F2D9",
    accentForeground: "#125f3d",
    border: "#DCE3DF",
    destructive: "#DC2626",
    success: "#16A34A",
    warning: "#D97706",
  },
  dark: {
    background: "#0F1A14",
    foreground: "#F2F7F3",
    card: "#17241C",
    cardForeground: "#F2F7F3",
    primary: "#9acd4f",
    primaryForeground: "#0F1A14",
    secondary: "#125f3d",
    secondaryForeground: "#F2F7F3",
    muted: "#1F2E25",
    mutedForeground: "#A9BDB1",
    accent: "#1F2E25",
    accentForeground: "#9acd4f",
    border: "#2A3B31",
    destructive: "#EF4444",
    success: "#22C55E",
    warning: "#F59E0B",
  },
} as const;

export type ColorScheme = keyof typeof Colors;
export type ThemeColors = (typeof Colors)[ColorScheme];

/**
 * Platform-appropriate font families. Use for `fontFamily` in styles, or load a
 * custom font with `useFonts` from `expo-font` and reference it here.
 */
export const Fonts = Platform.select({
  ios: {
    sans: "system-ui",
    serif: "ui-serif",
    rounded: "ui-rounded",
    mono: "ui-monospace",
  },
  default: {
    sans: "normal",
    serif: "serif",
    rounded: "normal",
    mono: "monospace",
  },
  web: {
    sans: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', sans-serif",
    mono: "'SF Mono', 'Roboto Mono', monospace",
  },
});
