import { useContext } from 'react';

import { ThemeContext } from '@/components/theme/theme-provider';
import type { Theme } from '@theme/index';

/**
 * Acesso ao design system dentro de componentes.
 *
 * Retorna o tema inteiro (`colors`, `typography`, `spacing`, `radius`, ...),
 * nao so as cores — assim um componente pega spacing e cores do mesmo lugar.
 *
 * ```tsx
 * const { colors, spacing } = useTheme();
 * ```
 *
 * Antes este hook lia `useColorScheme()` e devolvia a paleta light ou dark do
 * template. O app agora e dark-only (PRD secao 2.1), entao o esquema do sistema
 * nao entra mais na conta.
 */
export function useTheme(): Theme {
  return useContext(ThemeContext);
}
