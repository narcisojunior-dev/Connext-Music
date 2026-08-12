import { Text as RNText, type TextProps as RNTextProps } from 'react-native';

import { useTheme } from '@/hooks/use-theme';
import type { ColorToken, TypographyVariant } from '@theme/index';

export type TextProps = RNTextProps & {
  /** Escala tipografica do PRD. Default: `body`. */
  variant?: TypographyVariant;
  /** Token de cor. Default: `textPrimary`. */
  color?: ColorToken;
};

/**
 * Texto tipografado pelo tema.
 *
 * ```tsx
 * <Text variant="title">Nome da musica</Text>
 * <Text variant="caption" color="textSecondary">Artista</Text>
 * ```
 *
 * Nao exponha `fontSize` solto pelo app: escolha a variante mais proxima e, se
 * nenhuma servir, o caso provavelmente merece uma variante nova em
 * `typography.ts` em vez de um numero avulso no StyleSheet.
 */
export function Text({ variant = 'body', color = 'textPrimary', style, ...rest }: TextProps) {
  const theme = useTheme();

  return (
    <RNText style={[theme.typography[variant], { color: theme.colors[color] }, style]} {...rest} />
  );
}
