import { Platform, type TextStyle } from 'react-native';

/**
 * Tipografia do Connext Music (secao 2.2 do PRD).
 *
 * O PRD pede SF Pro Display para os tamanhos grandes e SF Pro Text para os
 * pequenos. No iOS isso sai de graca: a fonte de sistema (`system-ui`) e a
 * propria SF Pro, e o proprio iOS alterna entre os cortes Display e Text em
 * torno de 20pt. Por isso nao carregamos arquivos de fonte — pedir a fonte de
 * sistema entrega o resultado correto e respeita o Dynamic Type do usuario.
 */
export const fontFamily = Platform.select({
  ios: {
    sans: 'system-ui',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    mono: 'var(--font-mono)',
  },
}) as { sans: string; mono: string };

export const fontWeight = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
} as const satisfies Record<string, TextStyle['fontWeight']>;

/**
 * Escalas de texto. `lineHeight` segue ~1.25x o tamanho nos titulos e ~1.5x nos
 * textos corridos — titulos ficam compactos, corpo fica legivel.
 */
export const typography = {
  /** Titulo de tela */
  display: {
    fontFamily: fontFamily.sans,
    fontSize: 32,
    lineHeight: 40,
    fontWeight: fontWeight.bold,
  },
  /** Nome do album/artista */
  heading: {
    fontFamily: fontFamily.sans,
    fontSize: 24,
    lineHeight: 30,
    fontWeight: fontWeight.semibold,
  },
  /** Nome da musica */
  title: {
    fontFamily: fontFamily.sans,
    fontSize: 18,
    lineHeight: 24,
    fontWeight: fontWeight.semibold,
  },
  /** Texto geral */
  body: {
    fontFamily: fontFamily.sans,
    fontSize: 16,
    lineHeight: 24,
    fontWeight: fontWeight.regular,
  },
  /** Metadados secundarios */
  caption: {
    fontFamily: fontFamily.sans,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: fontWeight.regular,
  },
  /** Labels, timestamps */
  overline: {
    fontFamily: fontFamily.sans,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: fontWeight.medium,
  },
} as const satisfies Record<string, TextStyle>;

export type Typography = typeof typography;
export type TypographyVariant = keyof Typography;
