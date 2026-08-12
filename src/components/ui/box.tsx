import { View, type ViewProps, type ViewStyle } from 'react-native';

import { useTheme } from '@/hooks/use-theme';
import type { ColorToken, RadiusToken, SpacingToken } from '@theme/index';

export type BoxProps = ViewProps & {
  /** Token de cor de fundo. Omita para deixar transparente. */
  background?: ColorToken;
  /** Token de cor da borda. Ativa uma borda de 1px (StyleSheet.hairlineWidth nao le bem no dark). */
  borderColor?: ColorToken;
  padding?: SpacingToken;
  paddingHorizontal?: SpacingToken;
  paddingVertical?: SpacingToken;
  gap?: SpacingToken;
  radius?: RadiusToken;
  /** Aplica a sombra azul dos cards elevados (PRD 2.3). */
  elevated?: boolean;
};

/**
 * Container basico ligado ao tema. Recebe *tokens*, nao numeros, para que o
 * espacamento e as cores continuem consistentes conforme o app cresce.
 *
 * ```tsx
 * <Box background="surface" padding="lg" radius="card" gap="sm" />
 * ```
 */
export function Box({
  background,
  borderColor,
  padding,
  paddingHorizontal,
  paddingVertical,
  gap,
  radius,
  elevated = false,
  style,
  ...rest
}: BoxProps) {
  const theme = useTheme();

  const themedStyle: ViewStyle = {
    ...(background ? { backgroundColor: theme.colors[background] } : null),
    ...(borderColor ? { borderColor: theme.colors[borderColor], borderWidth: 1 } : null),
    ...(padding ? { padding: theme.spacing[padding] } : null),
    ...(paddingHorizontal ? { paddingHorizontal: theme.spacing[paddingHorizontal] } : null),
    ...(paddingVertical ? { paddingVertical: theme.spacing[paddingVertical] } : null),
    ...(gap ? { gap: theme.spacing[gap] } : null),
    ...(radius ? { borderRadius: theme.radius[radius] } : null),
  };

  return <View style={[themedStyle, elevated && theme.shadow.card, style]} {...rest} />;
}
