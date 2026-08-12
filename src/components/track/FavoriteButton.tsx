import { Ionicons } from '@expo/vector-icons';
import { Pressable } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
} from 'react-native-reanimated';

import { useTheme } from '@/hooks/use-theme';
import { hapticCommit, hapticControl } from '@/utils/haptics';

const AnimatedIcon = Animated.createAnimatedComponent(Ionicons);

export interface FavoriteButtonProps {
  isFavorite: boolean;
  onToggle: () => void;
  size?: number;
}

/**
 * Coração de favoritar, com animação de "like".
 *
 * A escala pulsa só ao **favoritar**, não ao desfavoritar: a animação celebra
 * uma ação positiva, e repeti-la ao remover daria o sinal errado.
 */
export function FavoriteButton({ isFavorite, onToggle, size = 22 }: FavoriteButtonProps) {
  const theme = useTheme();
  const scale = useSharedValue(1);

  // Sem `useCallback`: o handler muta um shared value do Reanimated, e o lint
  // do React Compiler trata isso como mutação de valor capturado por hook. O
  // ganho de memoizar um handler tão simples não compensa a exceção.
  const handlePress = () => {
    if (!isFavorite) {
      scale.value = withSequence(withSpring(1.35, { damping: 6 }), withSpring(1));
      hapticCommit();
    } else {
      hapticControl();
    }
    onToggle();
  };

  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={isFavorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
      accessibilityState={{ selected: isFavorite }}
      hitSlop={10}
      onPress={handlePress}
    >
      <AnimatedIcon
        name={isFavorite ? 'heart' : 'heart-outline'}
        size={size}
        color={isFavorite ? theme.colors.error : theme.colors.textMuted}
        style={animatedStyle}
      />
    </Pressable>
  );
}
