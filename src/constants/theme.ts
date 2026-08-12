/**
 * Constantes remanescentes do template Expo.
 *
 * > **Nao adicione nada aqui.** A fonte de verdade do design system e
 * > `src/theme/` (alias `@theme`). Este arquivo so existe enquanto as telas de
 * > exemplo do template (`explore.tsx` e os componentes `Themed*`) continuarem
 * > no projeto — a Issue #3 as substitui pelas telas reais e remove este
 * > arquivo.
 *
 * `Colors` foi repontado para a paleta dark do PRD para que o que ainda usa o
 * template nao destoe do resto do app.
 */

import '@/global.css';

import { Platform } from 'react-native';

import { colors, type ColorToken } from '@theme/colors';

/** O app e dark-only: as duas chaves apontam para a mesma paleta. */
export const Colors = {
  light: colors,
  dark: colors,
} as const;

/** Alias historico. Prefira `ColorToken` de `@theme` em codigo novo. */
export type ThemeColor = ColorToken;

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
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
