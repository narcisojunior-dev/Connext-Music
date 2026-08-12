import { Ionicons } from '@expo/vector-icons';
import { useKeepAwake } from 'expo-keep-awake';
import { router } from 'expo-router';
import * as ScreenOrientation from 'expo-screen-orientation';
import { useEffect } from 'react';
import { FlatList, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { NowPlayingArtwork } from '@/components/player/NowPlayingArtwork';
import { Text } from '@/components/ui/text';
import { useTheme } from '@/hooks/use-theme';
import { carLayout } from '@/services/car-mode/layout';
import { playQueue, skipToNext, skipToPrevious, togglePlay } from '@/services/player/queue-manager';
import { usePlayerStore } from '@/stores/player-store';
import { hapticControl } from '@/utils/haptics';

/** Altura de cada linha da fila. Grande o bastante para ser acertada sem mira. */
const QUEUE_ROW_HEIGHT = 72;

function CarButton({
  icon,
  label,
  size,
  onPress,
  primary = false,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  size: number;
  onPress: () => void;
  primary?: boolean;
}) {
  const theme = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={() => {
        hapticControl();
        onPress();
      }}
      style={({ pressed }) => [
        styles.button,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: primary ? theme.colors.primary : theme.colors.surfaceElevated,
          // Sem opacidade no pressionado: em pleno sol, um botão 30% mais
          // apagado some. Uma borda clara é visível em qualquer luz.
          borderWidth: pressed ? 3 : 0,
          borderColor: '#FFFFFF',
        },
      ]}
    >
      <Ionicons name={icon} size={size * 0.44} color="#FFFFFF" />
    </Pressable>
  );
}

/**
 * Modo carro.
 *
 * Tudo aqui é maior e mais contrastado que no player normal, porque é usado de
 * relance e a um braço de distância. As cores fogem do tema: o fundo é preto
 * puro e os textos brancos puros, e não os tons do design system, que foram
 * escolhidos para conforto em ambiente fechado e perdem legibilidade no sol.
 *
 * A tela não deixa o iPhone bloquear enquanto está aberta — bloqueando, a troca
 * de faixa exigiria desbloquear o telefone dirigindo.
 */
export default function CarModeScreen() {
  const theme = useTheme();
  const { width, height } = useWindowDimensions();

  useKeepAwake();

  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const queue = usePlayerStore((s) => s.queue);
  const currentIndex = usePlayerStore((s) => s.currentIndex);

  // Libera a rotação só nesta tela: o resto do app é retrato, e um suporte de
  // carro pode estar montado deitado.
  useEffect(() => {
    void ScreenOrientation.unlockAsync();
    return () => {
      void ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
    };
  }, []);

  const layout = carLayout(width, height);

  const exit = () => {
    hapticControl();
    if (router.canGoBack()) router.back();
    else router.replace('/');
  };

  if (!currentTrack) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.empty}>
          <Text variant="heading" style={styles.brightText}>
            Nada tocando
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Sair do modo carro"
            onPress={exit}
            style={[styles.exitWide, { borderColor: '#FFFFFF' }]}
          >
            <Text variant="title" style={styles.brightText}>
              Sair do modo carro
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const controls = (
    <View style={styles.controls}>
      <CarButton
        icon="play-skip-back"
        label="Faixa anterior"
        size={layout.secondaryControlSize}
        onPress={() => void skipToPrevious()}
      />
      <CarButton
        icon={isPlaying ? 'pause' : 'play'}
        label={isPlaying ? 'Pausar' : 'Reproduzir'}
        size={layout.primaryControlSize}
        primary
        onPress={() => void togglePlay()}
      />
      <CarButton
        icon="play-skip-forward"
        label="Próxima faixa"
        size={layout.secondaryControlSize}
        onPress={() => void skipToNext()}
      />
    </View>
  );

  const info = (
    <View style={styles.info}>
      {layout.artworkSize > 0 ? (
        <NowPlayingArtwork
          artwork={currentTrack.artwork}
          seed={currentTrack.id}
          size={layout.artworkSize}
        />
      ) : null}
      <Text variant="heading" numberOfLines={2} style={[styles.brightText, styles.centered]}>
        {currentTrack.title}
      </Text>
      <Text variant="title" numberOfLines={1} style={[styles.dimText, styles.centered]}>
        {currentTrack.artist}
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom', 'left', 'right']}>
      <View style={styles.topBar}>
        <Text variant="caption" style={styles.dimText}>
          {currentIndex + 1} / {queue.length}
        </Text>
      </View>

      <View style={layout.sideBySide ? styles.rowBody : styles.columnBody}>
        {info}
        {controls}
      </View>

      {/* A fila só aparece em retrato: em paisagem a altura mal comporta a capa
          e os controles, e espremer uma lista aí produziria linhas pequenas
          demais para o contexto. */}
      {!layout.sideBySide ? (
        <FlatList
          data={queue}
          keyExtractor={(item) => item.id}
          style={styles.queue}
          getItemLayout={(_, index) => ({
            length: QUEUE_ROW_HEIGHT,
            offset: QUEUE_ROW_HEIGHT * index,
            index,
          })}
          initialScrollIndex={Math.min(currentIndex, Math.max(0, queue.length - 1))}
          // Um item fora de tela na primeira medição não pode derrubar a lista
          // enquanto se dirige.
          onScrollToIndexFailed={() => {}}
          renderItem={({ item, index }) => {
            const active = index === currentIndex;
            return (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${item.title}, ${item.artist}`}
                onPress={() => {
                  hapticControl();
                  void playQueue(queue, index);
                }}
                style={({ pressed }) => [
                  styles.queueRow,
                  active && { backgroundColor: theme.colors.surfaceElevated },
                  pressed && styles.queueRowPressed,
                ]}
              >
                <Text
                  variant="title"
                  numberOfLines={1}
                  style={active ? styles.brightText : styles.dimText}
                >
                  {item.title}
                </Text>
                <Text variant="caption" numberOfLines={1} style={styles.dimText}>
                  {item.artist}
                </Text>
              </Pressable>
            );
          }}
        />
      ) : null}

      {/* Barra fixa na base: sair e a acao que mais precisa ser encontrada sem
          olhar, e no topo ela ficava fora do alcance do polegar — justamente a
          um braco de distancia, com o aparelho no suporte. */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Sair do modo carro"
        onPress={exit}
        style={({ pressed }) => [
          styles.exitBar,
          { borderColor: '#FFFFFF', backgroundColor: pressed ? '#1C1C1E' : 'transparent' },
        ]}
      >
        <Ionicons name="close" size={26} color="#FFFFFF" />
        <Text variant="title" style={styles.brightText}>
          Sair do modo carro
        </Text>
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // Preto puro, e não `colors.background`: o contraste máximo é o que torna a
    // tela legível de relance e sob luz forte.
    backgroundColor: '#000000',
  },
  brightText: {
    color: '#FFFFFF',
  },
  dimText: {
    // Cinza claro, não o `textSecondary` do tema — que sobre preto puro fica
    // escuro demais para ler de longe.
    color: '#C7C7CC',
  },
  centered: {
    textAlign: 'center',
  },
  topBar: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  exitBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    // Alto e largo o bastante para ser acertado sem mira, como os controles.
    minHeight: 72,
    marginHorizontal: 16,
    marginTop: 12,
    borderWidth: 2,
    borderRadius: 36,
  },
  exitWide: {
    borderWidth: 2,
    borderRadius: 24,
    paddingVertical: 16,
    paddingHorizontal: 28,
  },
  columnBody: {
    alignItems: 'center',
    gap: 20,
    paddingHorizontal: 16,
  },
  rowBody: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-evenly',
    paddingHorizontal: 16,
  },
  info: {
    alignItems: 'center',
    gap: 10,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
  },
  button: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
  },
  queue: {
    flex: 1,
    marginTop: 16,
  },
  queueRow: {
    height: QUEUE_ROW_HEIGHT,
    justifyContent: 'center',
    paddingHorizontal: 20,
    gap: 2,
  },
  queueRowPressed: {
    backgroundColor: '#1C1C1E',
  },
});
