import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Switch, View } from 'react-native';

import { Text } from '@/components/ui/text';
import { useTheme } from '@/hooks/use-theme';

export interface SettingsRowProps {
  title: string;
  /** Linha de apoio: o que a opção faz, ou por que está indisponível. */
  description?: string;
  /** Interruptor à direita. Omitido em linhas de ação. */
  value?: boolean;
  onValueChange?: (value: boolean) => void;
  /** Linha de ação: toque no bloco inteiro. */
  onPress?: () => void;
  /** Valor exibido à direita, para linhas puramente informativas. */
  detail?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  /** Ação destrutiva — pinta o título na cor de erro. */
  destructive?: boolean;
  disabled?: boolean;
}

/**
 * Linha da tela de Ajustes.
 *
 * Um componente para os quatro formatos (interruptor, ação, informação e ação
 * destrutiva) em vez de quatro: as diferenças são a borda direita e a cor do
 * título, e separá-los duplicaria o alinhamento e o estado de pressionado.
 */
export function SettingsRow({
  title,
  description,
  value,
  onValueChange,
  onPress,
  detail,
  icon,
  destructive = false,
  disabled = false,
}: SettingsRowProps) {
  const theme = useTheme();
  const interactive = !!onPress && !disabled;

  const body = (
    <>
      {icon ? (
        <Ionicons
          name={icon}
          size={20}
          color={destructive ? theme.colors.error : theme.colors.textSecondary}
        />
      ) : null}

      <View style={styles.text}>
        <Text
          variant="body"
          color={destructive ? 'error' : disabled ? 'textMuted' : 'textPrimary'}
          numberOfLines={1}
        >
          {title}
        </Text>
        {description ? (
          <Text variant="overline" color="textMuted">
            {description}
          </Text>
        ) : null}
      </View>

      {onValueChange ? (
        <Switch
          value={value}
          onValueChange={onValueChange}
          disabled={disabled}
          trackColor={{ true: theme.colors.primary, false: theme.colors.surfaceElevated }}
          // Sem isto o iOS pinta o polegar de branco tanto ligado quanto
          // desligado, e no tema escuro os dois estados ficam parecidos.
          ios_backgroundColor={theme.colors.surfaceElevated}
        />
      ) : null}

      {detail ? (
        <Text variant="caption" color="textMuted">
          {detail}
        </Text>
      ) : null}

      {interactive && !detail ? (
        <Ionicons name="chevron-forward" size={16} color={theme.colors.textMuted} />
      ) : null}
    </>
  );

  if (!interactive) {
    return <View style={styles.row}>{body}</View>;
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        { borderRadius: theme.radius.card },
        pressed && { backgroundColor: theme.colors.surfaceElevated },
      ]}
    >
      {body}
    </Pressable>
  );
}

export function SettingsSection({ title, children }: { title: string; children: React.ReactNode }) {
  const theme = useTheme();
  return (
    <View style={styles.section}>
      <Text variant="overline" color="textMuted">
        {title.toUpperCase()}
      </Text>
      <View
        style={[
          styles.card,
          { backgroundColor: theme.colors.surface, borderRadius: theme.radius.card },
        ]}
      >
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: 6,
  },
  card: {
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    minHeight: 44,
  },
  text: {
    flex: 1,
    gap: 1,
  },
});
