import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  type PressableProps,
  type ViewStyle,
} from 'react-native';

import { Text } from '@/components/ui/text';
import { useTheme } from '@/hooks/use-theme';
import type { ColorToken } from '@theme/index';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost';

export type ButtonProps = Omit<PressableProps, 'children' | 'style'> & {
  title: string;
  variant?: ButtonVariant;
  loading?: boolean;
  /** Ocupa toda a largura disponivel. */
  fullWidth?: boolean;
  style?: ViewStyle;
};

/**
 * Botao com as tres variantes do design system.
 *
 * - `primary`   — acao principal da tela (fundo azul solido)
 * - `secondary` — acao alternativa (contorno, fundo elevado)
 * - `ghost`     — acao terciaria (so texto, sem peso visual)
 *
 * O feedback de toque e cor, nao opacidade: no dark mode, baixar a opacidade
 * de um botao contra fundo escuro apenas o apaga em vez de sinalizar o toque.
 */
export function Button({
  title,
  variant = 'primary',
  loading = false,
  fullWidth = false,
  disabled,
  style,
  ...rest
}: ButtonProps) {
  const theme = useTheme();
  const isDisabled = disabled || loading;

  const background: Record<ButtonVariant, { base?: ColorToken; pressed?: ColorToken }> = {
    primary: { base: 'primary', pressed: 'primaryHover' },
    secondary: { base: 'surfaceElevated', pressed: 'surface' },
    ghost: { base: undefined, pressed: 'surface' },
  };

  const label: Record<ButtonVariant, ColorToken> = {
    primary: 'textPrimary',
    secondary: 'textPrimary',
    ghost: 'secondary',
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!isDisabled, busy: loading }}
      disabled={isDisabled}
      style={({ pressed }) => {
        const token = pressed ? background[variant].pressed : background[variant].base;
        return [
          styles.base,
          {
            paddingHorizontal: theme.spacing.xl,
            paddingVertical: theme.spacing.md,
            borderRadius: theme.radius.card,
            gap: theme.spacing.sm,
            backgroundColor: token ? theme.colors[token] : 'transparent',
          },
          variant === 'secondary' && { borderWidth: 1, borderColor: theme.colors.border },
          fullWidth && styles.fullWidth,
          isDisabled && styles.disabled,
          style,
        ];
      }}
      {...rest}
    >
      {loading && <ActivityIndicator size="small" color={theme.colors[label[variant]]} />}
      <Text variant="title" color={label[variant]}>
        {title}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullWidth: {
    alignSelf: 'stretch',
  },
  disabled: {
    opacity: 0.4,
  },
});
