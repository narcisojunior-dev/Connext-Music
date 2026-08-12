import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, type PressableProps, type ViewStyle } from 'react-native';

import { useTheme } from '@/hooks/use-theme';
import type { ColorToken } from '@theme/index';

export type IconButtonSize = 'sm' | 'md' | 'lg';

/** Diametro do botao e tamanho do glifo, em pt. */
const SIZES: Record<IconButtonSize, { box: number; glyph: number }> = {
  sm: { box: 32, glyph: 16 },
  md: { box: 44, glyph: 22 },
  lg: { box: 64, glyph: 32 },
};

export type IconButtonProps = Omit<PressableProps, 'children' | 'style'> & {
  name: React.ComponentProps<typeof Ionicons>['name'];
  /** Obrigatorio: o botao nao tem texto, entao precisa de um rotulo acessivel. */
  accessibilityLabel: string;
  size?: IconButtonSize;
  /** Cor do glifo. Default: `textPrimary`. */
  color?: ColorToken;
  /** Cor de fundo do circulo. Omita para um botao sem fundo. */
  background?: ColorToken;
  /** Estado ligado — usado por shuffle e repeat, que pintam de `primary` quando ativos. */
  active?: boolean;
  style?: ViewStyle;
};

/**
 * Botao circular com icone, usado nos controles de playback.
 *
 * `md` (44pt) e o default porque e o alvo minimo de toque recomendado pelas
 * Human Interface Guidelines; `sm` so deve aparecer com area de toque extra ao
 * redor.
 */
export function IconButton({
  name,
  accessibilityLabel,
  size = 'md',
  color = 'textPrimary',
  background,
  active = false,
  disabled,
  style,
  ...rest
}: IconButtonProps) {
  const theme = useTheme();
  const { box, glyph } = SIZES[size];
  const glyphColor = active ? theme.colors.primary : theme.colors[color];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: !!disabled, selected: active }}
      disabled={disabled}
      hitSlop={size === 'sm' ? theme.spacing.sm : undefined}
      style={({ pressed }) => [
        styles.base,
        {
          width: box,
          height: box,
          borderRadius: theme.radius.pill,
          backgroundColor: background ? theme.colors[background] : 'transparent',
        },
        pressed && styles.pressed,
        disabled && styles.disabled,
        style,
      ]}
      {...rest}
    >
      <Ionicons name={name} size={glyph} color={glyphColor} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    transform: [{ scale: 0.92 }],
  },
  disabled: {
    opacity: 0.4,
  },
});
