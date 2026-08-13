import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui/text';
import { useTheme } from '@/hooks/use-theme';

export interface EmptyStateProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  /** Botões de ação, quando há um próximo passo óbvio. */
  children?: React.ReactNode;
}

/**
 * Tela sem conteúdo — porque ainda não há, não porque falta implementar.
 *
 * A distinção importa: até a Issue #27 estes lugares usavam o
 * `PlaceholderScreen`, que estampa "EM CONSTRUÇÃO · Issue #N". A Biblioteca
 * vazia então anunciava a si mesma como inacabada, quando o que faltava era o
 * usuário adicionar música. Um app que se diz em construção não inspira
 * confiança para receber a coleção de alguém.
 */
export function EmptyState({ icon, title, description, children }: EmptyStateProps) {
  const theme = useTheme();

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={[styles.iconCircle, { backgroundColor: theme.colors.surface }]}>
          <Ionicons name={icon} size={44} color={theme.colors.textMuted} />
        </View>

        <Text variant="title" style={styles.center}>
          {title}
        </Text>

        <Text variant="body" color="textSecondary" style={styles.center}>
          {description}
        </Text>
      </View>

      {children ? <View style={styles.actions}>{children}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 32,
    // Sobe o bloco um pouco acima do centro ótico: centralizado de verdade, ele
    // parece baixo demais numa tela alta.
    paddingBottom: 80,
  },
  content: {
    alignItems: 'center',
    gap: 12,
  },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  center: {
    textAlign: 'center',
  },
  actions: {
    // Os botões colavam um no outro; 12 é o mesmo respiro usado entre blocos
    // de ação no resto do app.
    gap: 12,
    paddingTop: 32,
  },
});
