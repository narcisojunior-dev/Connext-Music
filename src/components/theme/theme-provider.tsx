import { createContext, type ReactNode } from 'react';

import { theme, type Theme } from '@theme/index';

/**
 * O valor default e o proprio tema, entao `useTheme()` funciona mesmo fora do
 * provider (em testes isolados, por exemplo). O provider existe para quando o
 * tema deixar de ser uma constante — troca de tema, cores derivadas da artwork
 * da faixa atual (Issue #16) — sem que nenhum componente precise mudar.
 */
export const ThemeContext = createContext<Theme>(theme);

export type ThemeProviderProps = {
  children: ReactNode;
  /** Sobrescreve o tema. Usado em testes e em previews de componentes. */
  value?: Theme;
};

export function ThemeProvider({ children, value = theme }: ThemeProviderProps) {
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
