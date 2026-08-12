import TrackPlayer, {
  AppKilledPlaybackBehavior,
  Capability,
  Event,
  IOSCategory,
  IOSCategoryMode,
  IOSCategoryOptions,
} from 'react-native-track-player';

import { JUMP_SECONDS } from '@/services/player/constants';
import { useLibraryStore } from '@/stores/library-store';
import { usePlayerStore } from '@/stores/player-store';

/**
 * Controles que aparecem na tela de bloqueio e no Control Center.
 *
 * `SeekTo` e o que faz a barra de progresso do Control Center virar um slider
 * arrastavel em vez de um indicador so de leitura.
 */
const CAPABILITIES = [
  Capability.Play,
  Capability.Pause,
  Capability.SkipToNext,
  Capability.SkipToPrevious,
  Capability.SeekTo,
  Capability.JumpForward,
  Capability.JumpBackward,
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
      // tela bloqueada; sem isso o iOS silencia o app ao sair para o inicio.
      iosCategory: IOSCategory.Playback,
      iosCategoryMode: IOSCategoryMode.Default,
      // Continua tocando quando o usuario vira o botao de silencioso — e o
      // comportamento esperado de um player de musica, nao de um app de video.
      iosCategoryOptions: [IOSCategoryOptions.AllowAirPlay, IOSCategoryOptions.AllowBluetooth],
    });

    await TrackPlayer.updateOptions({
      android: {
        appKilledPlaybackBehavior: AppKilledPlaybackBehavior.StopPlaybackAndRemoveNotification,
      },
      capabilities: CAPABILITIES,
      // O que aparece na notificacao compacta do Android; no iOS os controles
      // da lock screen saem de `capabilities`.
      compactCapabilities: [Capability.Play, Capability.Pause, Capability.SkipToNext],
      // Sem estes intervalos o iOS mostra os botoes de salto com o valor
      // padrao (15s), que nao bate com o que o app faz na propria tela.
      forwardJumpInterval: JUMP_SECONDS,
      backwardJumpInterval: JUMP_SECONDS,
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
  TrackPlayer.addEventListener(Event.RemotePlay, () => TrackPlayer.play());
  TrackPlayer.addEventListener(Event.RemotePause, () => TrackPlayer.pause());
  TrackPlayer.addEventListener(Event.RemoteStop, () => TrackPlayer.stop());
  TrackPlayer.addEventListener(Event.RemoteNext, () => TrackPlayer.skipToNext());
  TrackPlayer.addEventListener(Event.RemotePrevious, () => TrackPlayer.skipToPrevious());
  TrackPlayer.addEventListener(Event.RemoteSeek, ({ position }) => TrackPlayer.seekTo(position));

  // Saltos vindos da tela de bloqueio e do Control Center. O `interval` chega
  // do proprio iOS, entao respeitamos o que ele pediu em vez de assumir 10s.
  TrackPlayer.addEventListener(Event.RemoteJumpForward, ({ interval }) =>
    TrackPlayer.seekBy(interval ?? JUMP_SECONDS),
  );
  TrackPlayer.addEventListener(Event.RemoteJumpBackward, ({ interval }) =>
    TrackPlayer.seekBy(-(interval ?? JUMP_SECONDS)),
  );

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
    usePlayerStore.getState().setIsPlaying(state === 'playing');
  });

  TrackPlayer.addEventListener(Event.PlaybackProgressUpdated, ({ position, duration }) => {
    usePlayerStore.getState().setProgress(position, duration);
  });

  // Troca de faixa — por fim natural da anterior ou por comando remoto.
  TrackPlayer.addEventListener(Event.PlaybackActiveTrackChanged, ({ index }) => {
    if (index === undefined || index === null) return;
    usePlayerStore.getState().setCurrentIndex(index);

    const track = usePlayerStore.getState().queue[index];
    if (track) useLibraryStore.getState().registerPlay(track.id);
  });

  TrackPlayer.addEventListener(Event.PlaybackError, ({ code, message }) => {
    console.warn(`[player] falha na reprodução (${code}): ${message}`);
  });
}
