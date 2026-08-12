import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { Box } from '@/components/ui/box';
import { Text } from '@/components/ui/text';
import { useTheme } from '@/hooks/use-theme';
import { useLibraryStore } from '@/stores/library-store';

/**
 * Barra de progresso animada do scan de biblioteca.
 *
 * Lê `scanProgress` direto do store — pode viver em qualquer tela sem depender
 * de props. A largura da barra é animada com spring para dar um feedback
 * orgânico (sem pular de 10% para 40% de um frame ao outro).
 */
export function ScanProgress() {
  const theme = useTheme();
  const progress = useLibraryStore((s) => s.scanProgress);

  const width = useSharedValue(0);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (progress && progress.total > 0) {
      const ratio = Math.min(progress.current / progress.total, 1);
      width.value = withSpring(ratio * 100, {
        damping: 20,
        stiffness: 120,
        mass: 0.8,
      });
      opacity.value = withTiming(1, { duration: 200 });
    } else {
      width.value = withTiming(0, { duration: 300 });
      opacity.value = withTiming(0, { duration: 200 });
    }
  }, [progress, width, opacity]);

  const barStyle = useAnimatedStyle(() => ({
    width: `${width.value}%`,
  }));

  const containerStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  if (!progress) return null;

  return (
    <Animated.View style={containerStyle}>
      <Box background="surface" padding="md" radius="card" gap="sm">
        <View style={styles.header}>
          <Text variant="overline" color="primary">
            Escaneando...
          </Text>
          <Text variant="overline" color="textSecondary">
            {progress.current}/{progress.total}
          </Text>
        </View>
        <Text variant="overline" color="textMuted" numberOfLines={1}>
          {progress.fileName}
        </Text>
        <View style={[styles.track, { backgroundColor: theme.colors.surfaceElevated }]}>
          <Animated.View
            style={[styles.fill, { backgroundColor: theme.colors.primary }, barStyle]}
          />
        </View>
      </Box>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  track: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 2,
  },
});
