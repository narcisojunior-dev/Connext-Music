/**
 * Ponto unico de entrada do design system (`@theme`).
 *
 * Importe daqui — `import { theme } from '@theme/index'` — em vez de alcancar
 * `colors.ts` / `spacing.ts` diretamente. Em componentes, prefira o hook
 * `useTheme()`, que le o mesmo objeto pelo Context e mantem a porta aberta
 * para trocar o tema em runtime sem reescrever os componentes.
 */
import { colors } from './colors';
import { duration, radius, shadow, spacing } from './spacing';
import { fontFamily, fontWeight, typography } from './typography';

export const theme = {
  colors,
  typography,
  fontFamily,
  fontWeight,
  spacing,
  radius,
  shadow,
  duration,
} as const;

export type Theme = typeof theme;

export * from './colors';
export * from './spacing';
export * from './typography';
