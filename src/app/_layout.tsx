// Define as variaveis CSS (--font-display, --font-mono) que `typography.ts`
// referencia no build web. Sem efeito no iOS, mas precisa vir da raiz do app.
import '@/global.css';

import { DarkTheme, ThemeProvider as NavigationThemeProvider, Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { ThemeProvider } from '@/components/theme/theme-provider';
import { useLibraryStore } from '@/stores/library-store';
import { usePlaylistStore } from '@/stores/playlist-store';
import { useSettingsStore } from '@/stores/settings-store';
import { useSiriCommands, useSiriPlaylistSync } from '@/hooks/use-siri-commands';
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
  const hydrate = useLibraryStore((s) => s.hydrate);
  const hydratePlaylists = usePlaylistStore((s) => s.hydrate);
  const hydrateSettings = useSettingsStore((s) => s.hydrate);

  // Atalhos do Siri: um publica as playlists para o Siri poder oferece-las por
  // nome, o outro executa o comando que o atalho deixou no App Group.
  useSiriPlaylistSync();
  useSiriCommands();

  // Le a biblioteca salva assim que o app abre, para as telas ja nascerem com
  // as faixas em vez de esperar um scan.
  useEffect(() => {
    hydrate();
    hydratePlaylists();
    hydrateSettings();
  }, [hydrate, hydratePlaylists, hydrateSettings]);

  return (
    // Sem esta raiz, todo `GestureDetector` da arvore e ignorado em silencio —
    // o slider de progresso simplesmente nao responderia ao arraste.
    <GestureHandlerRootView style={{ flex: 1 }}>
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
              options={{
                presentation: 'fullScreenModal',
                headerShown: false,
                // A capa do mini player esta na mesma posicao horizontal da capa
                // grande, entao subir a tela inteira ja le como a barra
                // "crescendo" ate virar o player. Um shared element de verdade
                // exigiria medir e sobrepor a capa fora da arvore de navegacao,
                // e o ganho nao paga a complexidade.
                animation: 'slide_from_bottom',
                gestureDirection: 'vertical',
              }}
            />

            <Stack.Screen name="playlist/[id]" options={{ title: 'Playlist' }} />
            {/* O titulo real e definido pela propria tela, que so conhece o nome
                da lista depois de resolver o id. */}
            <Stack.Screen name="smart/[id]" options={{ title: 'Playlist' }} />
            <Stack.Screen name="stats" options={{ title: 'Estatísticas' }} />
            <Stack.Screen name="onboarding" options={{ headerShown: false }} />
            {/* Rota de passagem dos botoes do widget: executa e redireciona,
                entao nao deve piscar um cabecalho. */}
            <Stack.Screen name="widget/[action]" options={{ headerShown: false }} />
            {/* Sem cabecalho e em tela cheia: no carro, cada elemento que nao e
                controle e ruido. */}
            <Stack.Screen
              name="car-mode"
              options={{ presentation: 'fullScreenModal', headerShown: false }}
            />
            <Stack.Screen name="design-system" options={{ title: 'Design System' }} />
          </Stack>
        </NavigationThemeProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
