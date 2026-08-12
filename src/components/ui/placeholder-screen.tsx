import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import { Box } from '@/components/ui/box';
import { Text } from '@/components/ui/text';
import { useTheme } from '@/hooks/use-theme';

export type PlaceholderScreenProps = {
  title: string;
  /** Uma linha sobre o que a tela vai fazer quando existir. */
  description: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  /** Issue que implementa a tela — some quando a tela fica pronta. */
  issue: string;
};

/**
 * Tela "em construcao" das rotas ainda nao implementadas (Issue #3).
 *
 * Existe para que a navegacao possa ser montada e testada por inteiro antes
 * das telas reais, e para deixar visivel qual issue preenche cada rota.
 */
export function PlaceholderScreen({ title, description, icon, issue }: PlaceholderScreenProps) {
  const theme = useTheme();

  return (
    <Box background="background" style={styles.container} gap="lg">
      <View
        style={[
          styles.iconCircle,
          { backgroundColor: theme.colors.surface, borderRadius: theme.radius.pill },
        ]}
      >
        <Ionicons name={icon} size={40} color={theme.colors.textMuted} />
      </View>

      <Box gap="xs" style={styles.copy}>
        <Text variant="heading" style={styles.center}>
          {title}
        </Text>
        <Text variant="body" color="textSecondary" style={styles.center}>
          {description}
        </Text>
      </Box>

      <Box background="surface" paddingHorizontal="lg" paddingVertical="sm" radius="pill">
        <Text variant="overline" color="textMuted">
          EM CONSTRUÇÃO · {issue}
        </Text>
      </Box>
    </Box>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  iconCircle: {
    width: 88,
    height: 88,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: {
    alignItems: 'center',
  },
  center: {
    textAlign: 'center',
  },
});
