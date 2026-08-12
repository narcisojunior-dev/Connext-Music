import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { Tabs } from 'expo-router';
import { Platform, StyleSheet } from 'react-native';

import { useTheme } from '@/hooks/use-theme';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

/**
 * Cada tab tem um par de icones: contorno quando inativa, preenchido quando
 * ativa. E o idioma visual do iOS e da a leitura de estado mesmo para quem nao
 * distingue bem o azul do cinza.
 */
const TABS: { name: string; title: string; icon: IoniconName; iconActive: IoniconName }[] = [
  {
    name: 'index',
    title: 'Biblioteca',
    icon: 'musical-notes-outline',
    iconActive: 'musical-notes',
  },
  { name: 'search', title: 'Busca', icon: 'search-outline', iconActive: 'search' },
  { name: 'playlists', title: 'Playlists', icon: 'list-outline', iconActive: 'list' },
  { name: 'settings', title: 'Ajustes', icon: 'settings-outline', iconActive: 'settings' },
];

export default function TabsLayout() {
  const theme = useTheme();

  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: theme.colors.background },
        headerTintColor: theme.colors.textPrimary,
        headerTitleStyle: theme.typography.heading,
        headerShadowVisible: false,

        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.textMuted,
        tabBarLabelStyle: theme.typography.overline,
        sceneStyle: { backgroundColor: theme.colors.background },

        // O glassmorphism do PRD: a tab bar flutua sobre o conteudo com blur.
        // `position: absolute` e o que tira a barra do fluxo e deixa a lista
        // correr por baixo — em troca, telas com scroll precisam de padding
        // inferior para o ultimo item nao ficar escondido atras dela.
        tabBarStyle: Platform.select({
          ios: {
            position: 'absolute',
            backgroundColor: 'transparent',
            borderTopColor: theme.colors.border,
          },
          default: {
            backgroundColor: theme.colors.surface,
            borderTopColor: theme.colors.border,
          },
        }),
        tabBarBackground: () =>
          Platform.OS === 'ios' ? (
            <BlurView tint="dark" intensity={80} style={StyleSheet.absoluteFill} />
          ) : null,
      }}
    >
      {TABS.map(({ name, title, icon, iconActive }) => (
        <Tabs.Screen
          key={name}
          name={name}
          options={{
            title,
            tabBarIcon: ({ color, size, focused }) => (
              <Ionicons name={focused ? iconActive : icon} size={size} color={color} />
            ),
          }}
        />
      ))}
    </Tabs>
  );
}
