import { Pressable, ScrollView, StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { Text } from '@/components/ui/text';
import { useTheme } from '@/hooks/use-theme';

export type LibraryTab = 'all' | 'favorites' | 'artists' | 'albums' | 'genres' | 'folders';

const TABS: { key: LibraryTab; label: string }[] = [
  { key: 'all', label: 'Todas' },
  { key: 'favorites', label: 'Favoritas' },
  { key: 'artists', label: 'Artistas' },
  { key: 'albums', label: 'Álbuns' },
  { key: 'genres', label: 'Gêneros' },
  { key: 'folders', label: 'Pastas' },
];

export interface LibraryTabsProps {
  activeTab: LibraryTab;
  onTabChange: (tab: LibraryTab) => void;
}

/**
 * Barra de tabs horizontal para filtrar a biblioteca.
 *
 * Usa `ScrollView` horizontal para que caiba em telas estreitas.
 * O indicador de tab ativa é um pill com fundo `primary` e spring animation.
 */
export function LibraryTabs({ activeTab, onTabChange }: LibraryTabsProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      {TABS.map(({ key, label }) => {
        const isActive = activeTab === key;
        return (
          <TabPill key={key} label={label} isActive={isActive} onPress={() => onTabChange(key)} />
        );
      })}
    </ScrollView>
  );
}

function TabPill({
  label,
  isActive,
  onPress,
}: {
  label: string;
  isActive: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Pressable
      onPress={onPress}
      // eslint-disable-next-line react-hooks/immutability -- Reanimated SharedValue.value is designed to be mutated
      onPressIn={() => (scale.value = withSpring(0.95, { damping: 15, stiffness: 200 }))}
      // eslint-disable-next-line react-hooks/immutability -- Reanimated SharedValue.value is designed to be mutated
      onPressOut={() => (scale.value = withSpring(1, { damping: 15, stiffness: 200 }))}
    >
      <Animated.View
        style={[
          styles.pill,
          {
            backgroundColor: isActive ? theme.colors.primary : theme.colors.surface,
            borderRadius: theme.radius.pill,
          },
          animatedStyle,
        ]}
      >
        <Text
          variant="caption"
          color={isActive ? 'textPrimary' : 'textSecondary'}
          style={isActive ? styles.activeLabel : undefined}
        >
          {label}
        </Text>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  pill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  activeLabel: {
    fontWeight: '600',
  },
});
