// Define as variaveis CSS (--font-display, --font-mono) que `typography.ts`
// referencia no build web. Sem efeito no iOS, mas precisa vir da raiz do app.
import '@/global.css';

import { DarkTheme, ThemeProvider as NavigationThemeProvider, Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { ThemeProvider } from '@/components/theme/theme-provider';
import { theme } from '@theme/index';

SplashScreen.preventAutoHideAsync();

/**
 * Dois providers, dois papeis: `ThemeProvider` serve os tokens do design system
 * aos nossos componentes, enquanto o do expo-router pinta o chrome de navegacao
 * (headers, fundo das transicoes) que nao passa por eles. Os dois apontam para a
 * mesma paleta para nao existir um flash claro entre telas.
 */
const navigationTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: theme.colors.background,
    card: theme.colors.surface,
    text: theme.colors.textPrimary,
    border: theme.colors.border,
    primary: theme.colors.primary,
  },
};

export default function RootLayout() {
  return (
    <ThemeProvider>
      <NavigationThemeProvider value={navigationTheme}>
        <AnimatedSplashOverlay />
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: theme.colors.background },
            headerTintColor: theme.colors.textPrimary,
            headerTitleStyle: theme.typography.title,
            contentStyle: { backgroundColor: theme.colors.background },
          }}
        >
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />

          {/*
            O player cobre a tela inteira e some com a tab bar — e o modo
            "estou ouvindo isto", nao mais uma aba. `fullScreenModal` da a
            animacao slide-up que o PRD pede; o header sai porque a tela tem os
            proprios controles de minimizar/opcoes (Issue #11).
          */}
          <Stack.Screen
            name="player"
            options={{ presentation: 'fullScreenModal', headerShown: false }}
          />

          <Stack.Screen name="playlist/[id]" options={{ title: 'Playlist' }} />
          <Stack.Screen name="design-system" options={{ title: 'Design System' }} />
        </Stack>
      </NavigationThemeProvider>
    </ThemeProvider>
  );
}
