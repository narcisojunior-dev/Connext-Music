/**
 * Paleta de cores do Connext Music.
 *
 * Valores definidos na secao 2.1 do PRD. O app e **dark-only** por design: o
 * conteudo principal e artwork de album, e um fundo escuro evita que a UI
 * compita com a capa. Nao existe variante light — se um dia existir, ela entra
 * aqui como um segundo objeto e o ThemeProvider passa a escolher entre os dois.
 */
export const colors = {
  /** Fundo principal do app */
  background: '#0A0E1A',
  /** Cards, modais, input fields */
  surface: '#161B2E',
  /** Hover, selected items */
  surfaceElevated: '#1E2438',

  /** Botoes principais, progress bar, active states */
  primary: '#3B82F6',
  /** Botao pressionado */
  primaryHover: '#2563EB',
  /** Links secundarios, highlights */
  secondary: '#60A5FA',
  /** Now playing indicator, waveform, equalizer */
  accent: '#22D3EE',

  /** Titulos, nomes de musicas */
  textPrimary: '#F1F5F9',
  /** Artistas, albuns, metadados */
  textSecondary: '#94A3B8',
  /** Timestamps, labels */
  textMuted: '#64748B',

  /** Divisores, bordas de cards */
  border: '#1E293B',

  /** Download completo, sucesso */
  success: '#10B981',
  /** Alertas leves */
  warning: '#F59E0B',
  /** Erros, exclusao */
  error: '#EF4444',

  /** Modais, bottom sheets */
  overlay: 'rgba(10, 14, 26, 0.85)',
} as const;

export type Colors = typeof colors;
export type ColorToken = keyof Colors;
