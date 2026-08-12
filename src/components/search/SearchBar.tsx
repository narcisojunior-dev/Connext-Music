import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, TextInput, View } from 'react-native';

import { IconButton } from '@/components/ui/icon-button';
import { useTheme } from '@/hooks/use-theme';

export interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  onSubmit?: () => void;
  onFocus?: () => void;
  placeholder?: string;
}

/** Campo de busca fixo no topo da tela. */
export function SearchBar({
  value,
  onChangeText,
  onSubmit,
  onFocus,
  placeholder = 'Buscar músicas, artistas, álbuns…',
}: SearchBarProps) {
  const theme = useTheme();

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: theme.colors.surface, borderRadius: theme.radius.card },
      ]}
    >
      <Ionicons name="search" size={18} color={theme.colors.textMuted} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        onSubmitEditing={onSubmit}
        onFocus={onFocus}
        placeholder={placeholder}
        placeholderTextColor={theme.colors.textMuted}
        style={[styles.input, theme.typography.body, { color: theme.colors.textPrimary }]}
        returnKeyType="search"
        autoCorrect={false}
        autoCapitalize="none"
        clearButtonMode="never"
        accessibilityLabel="Campo de busca"
      />
      {value.length > 0 && (
        <IconButton
          name="close-circle"
          accessibilityLabel="Limpar busca"
          size="sm"
          color="textMuted"
          onPress={() => onChangeText('')}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    height: 44,
  },
  input: {
    flex: 1,
    // O padding vertical do TextInput desalinha o texto no iOS.
    paddingVertical: 0,
  },
});
