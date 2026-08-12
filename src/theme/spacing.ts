import { Platform } from 'react-native';

/**
 * Escala de espacamento com base 4pt — a mesma grade das Human Interface
 * Guidelines. Sempre prefira um degrau da escala a um numero solto no
 * StyleSheet: e o que mantem o ritmo vertical consistente entre telas.
 */
export const spacing = {
  none: 0,
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

/** Raios de borda (secao 2.3 do PRD). */
export const radius = {
  /** Cards, botoes */
  card: 12,
  /** Modais, bottom sheets */
  modal: 24,
  /** Pills, badges, botoes circulares */
  pill: 999,
} as const;

/** Sombra dos cards elevados: `0 4px 20px rgba(59, 130, 246, 0.15)`. */
export const shadow = {
  card: Platform.select({
    ios: {
      shadowColor: '#3B82F6',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 20,
    },
    default: {
      elevation: 6,
      shadowColor: '#3B82F6',
    },
  }),
} as const;

/** Duracoes de animacao (secao 2.3 do PRD). */
export const duration = {
  /** Transicoes padrao, ease-in-out */
  base: 200,
  /** Interacoes com spring */
  spring: 300,
} as const;

export type Spacing = typeof spacing;
export type SpacingToken = keyof Spacing;
export type RadiusToken = keyof typeof radius;
