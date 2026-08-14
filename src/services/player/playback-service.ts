import TrackPlayer, {
  AppKilledPlaybackBehavior,
  Capability,
  Event,
  IOSCategory,
  IOSCategoryMode,
} from 'react-native-track-player';

import { createPlayTracker } from '@/services/player/play-tracking';
import { createVolumeController } from '@/services/player/volume-controller';
import { publishNowPlaying } from '@/services/widget/now-playing-widget';
import { useSettingsStore } from '@/stores/settings-store';
import { useLibraryStore } from '@/stores/library-store';
import { usePlayerStore } from '@/stores/player-store';

/**
 * Controles que aparecem na tela de bloqueio e no Control Center.
 *
 * `SeekTo` e o que faz a barra de progresso do Control Center virar um slider
 * arrastavel em vez de um indicador so de leitura.
 *
 * Sem `JumpForward`/`JumpBackward` de proposito: quando as duas familias estao
 * declaradas, o iOS escolhe os botoes de salto de 10s e esconde os de faixa
 * anterior/proxima. Na tela de bloqueio o que se quer e trocar de musica; o
 * salto de {@link JUMP_SECONDS} continua disponivel dentro do app.
 */
const CAPABILITIES = [
  Capability.Play,
  Capability.Pause,
  Capability.SkipToNext,
  Capability.SkipToPrevious,
  Capability.SeekTo,
  Capability.Stop,
];

let setupPromise: Promise<void> | null = null;

/**
 * Prepara o Track Player. Idempotente e seguro para chamar de varias telas.
 *
 * A promessa e guardada pelo mesmo motivo do `hydrate` da biblioteca: duas
 * telas montando no mesmo frame chamariam `setupPlayer` duas vezes, e a segunda
 * chamada estoura porque o player ja existe.
 */
export async function setupPlayer(): Promise<void> {
  setupPromise ??= (async () => {
    await TrackPlayer.setupPlayer({
      // `playback` mantem o audio tocando com o app em segundo plano e com a
      // tela bloqueada, e e o que faz o iOS exibir os controles na tela de
      // bloqueio e na Central de Controle.
      iosCategory: IOSCategory.Playback,
      iosCategoryMode: IOSCategoryMode.Default,
      // Sem opcoes de categoria, de proposito.
      //
      // `AllowAirPlay` e `AllowBluetooth` (HFP) sao, pelo header do SDK,
      // "only valid with AVAudioSessionCategoryPlayAndRecord". Passa-las junto
      // de `playback` faz `setCategory` lancar — e o Track Player chama esse
      // metodo com `try?`, engolindo o erro. A sessao ficava entao na
      // categoria padrao, sem audio em segundo plano e sem Now Playing.
      //
      // Nada se perde: para categorias de saida como `playback`, o header diz
      // que A2DP "is always implicitly true and cannot be changed" — fones
      // Bluetooth e AirPlay ja funcionam por padrao.
    });

    await TrackPlayer.updateOptions({
      android: {
        appKilledPlaybackBehavior: AppKilledPlaybackBehavior.StopPlaybackAndRemoveNotification,
      },
      capabilities: CAPABILITIES,
      // O que aparece na notificacao compacta do Android; no iOS os controles
      // da lock screen saem de `capabilities`.
      compactCapabilities: [
        Capability.Play,
        Capability.Pause,
        Capability.SkipToPrevious,
        Capability.SkipToNext,
      ],
      progressUpdateEventInterval: 1,
    });
  })().catch((error) => {
    // Zera para uma proxima tentativa poder acontecer — do contrario o app
    // ficaria sem player pelo resto da sessao por causa de uma falha isolada.
    setupPromise = null;
    throw error;
  });

  return setupPromise;
}

/**
 * Servico de playback do Track Player.
 *
 * Roda fora da arvore do React — inclusive com o app em segundo plano — e por
 * isso nao pode usar hooks. Escreve direto nos stores via `getState()`, que e o
 * caminho suportado pelo Zustand fora de componentes.
 *
 * E aqui que os controles da lock screen, do Control Center e dos fones de
 * ouvido chegam.
 */
export async function playbackService(): Promise<void> {
  // Um por processo: o servico de playback e registrado uma vez e vive
  // enquanto o app vive.
  const playTracker = createPlayTracker();
  const volume = createVolumeController();

  TrackPlayer.addEventListener(Event.RemotePlay, () => TrackPlayer.play());
  TrackPlayer.addEventListener(Event.RemotePause, () => TrackPlayer.pause());
  TrackPlayer.addEventListener(Event.RemoteStop, () => TrackPlayer.stop());
  TrackPlayer.addEventListener(Event.RemoteNext, () => TrackPlayer.skipToNext());
  TrackPlayer.addEventListener(Event.RemotePrevious, () => TrackPlayer.skipToPrevious());
  TrackPlayer.addEventListener(Event.RemoteSeek, ({ position }) => TrackPlayer.seekTo(position));

  // Fone desconectado (ou AirPods removidos): pausa, como fazem os demais
  // players. Retomar sozinho quando o fone volta faria a musica tocar alto no
  // alto-falante em situacoes indesejadas.
  TrackPlayer.addEventListener(Event.RemoteDuck, async ({ paused, permanent }) => {
    if (permanent) {
      await TrackPlayer.pause();
      return;
    }
    if (paused) await TrackPlayer.pause();
    else await TrackPlayer.play();
  });

  // O estado real do audio manda: a UI reflete o player, nunca o contrario.
  TrackPlayer.addEventListener(Event.PlaybackState, ({ state }) => {
    const isPlaying = state === 'playing';
    usePlayerStore.getState().setIsPlaying(isPlaying);
    // Play/pause muda o icone do widget; e o unico outro momento, alem da troca
    // de faixa, em que vale gastar uma recarga.
    publishNowPlaying(usePlayerStore.getState().currentTrack, isPlaying);
  });

  TrackPlayer.addEventListener(Event.PlaybackProgressUpdated, ({ position, duration }) => {
    usePlayerStore.getState().setProgress(position, duration);

    const track = usePlayerStore.getState().currentTrack;
    if (track && playTracker.onProgress({ trackId: track.id, position, duration })) {
      useLibraryStore.getState().countPlay(track.id);
    }

    void volume.update(track, position, duration);

    // Sleep timer por relogio. E aqui, e nao num `setTimeout`, porque um
    // timer de JS nao e confiavel com o app em segundo plano — que e
    // exatamente onde o sleep timer precisa funcionar. O evento de progresso
    // chega do lado nativo e continua chegando com a tela apagada.
    const timer = useSettingsStore.getState().sleepTimer;
    if (timer?.expiresAt !== null && timer !== null && Date.now() >= timer.expiresAt) {
      useSettingsStore.getState().cancelSleepTimer();
      void volume.fadeOut().then(async () => {
        await TrackPlayer.pause();
        volume.reset();
      });
    }
  });

  // Troca de faixa — por fim natural da anterior ou por comando remoto.
  TrackPlayer.addEventListener(Event.PlaybackActiveTrackChanged, ({ index }) => {
    if (index === undefined || index === null) return;
    usePlayerStore.getState().setCurrentIndex(index);

    playTracker.onPlaybackStart();

    const track = usePlayerStore.getState().queue[index];
    if (track) useLibraryStore.getState().registerPlayStart(track.id);

    if (track) publishNowPlaying(track, usePlayerStore.getState().isPlaying);

    // A faixa nova comeca em volume cheio, desfazendo o fade da anterior.
    volume.reset();
    if (track) void volume.update(track, 0, track.duration);

    // Sleep timer "fim da faixa atual": a troca de faixa e o gatilho.
    const timer = useSettingsStore.getState().sleepTimer;
    if (timer?.option === 'endOfTrack') {
      useSettingsStore.getState().cancelSleepTimer();
      void TrackPlayer.pause();
    }
  });

  TrackPlayer.addEventListener(Event.PlaybackError, ({ code, message }) => {
    console.warn(`[player] falha na reprodução (${code}): ${message}`);
  });
}
