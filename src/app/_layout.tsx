import { DarkTheme, ThemeProvider as NavigationThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import AppTabs from '@/components/app-tabs';
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
        <AppTabs />
      </NavigationThemeProvider>
    </ThemeProvider>
  );
}
