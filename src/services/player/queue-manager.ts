import TrackPlayer, { RepeatMode, type Track as RNTPTrack } from 'react-native-track-player';

import { setupPlayer } from '@/services/player/playback-service';
import { usePlayerStore, type RepeatMode as StoreRepeatMode } from '@/stores/player-store';
import type { Track } from '@/types/track';

/**
 * Converte uma `Track` nossa para o formato do Track Player.
 *
 * `artwork` so entra quando existe: passar `null` faz o iOS exibir um quadro
 * vazio na lock screen em vez de recuar para o icone do app.
 */
function toPlayerTrack(track: Track): RNTPTrack {
  return {
    id: track.id,
    url: track.url,
    title: track.title,
    artist: track.artist,
    album: track.album,
    genre: track.genre || undefined,
    duration: track.duration || undefined,
    ...(track.artwork ? { artwork: track.artwork } : null),
  };
}

/**
 * Toca uma fila a partir de uma posicao.
 *
 * O store e atualizado antes de o audio comecar para a UI responder ao toque
 * na hora, sem esperar o arquivo abrir.
 */
export async function playQueue(tracks: Track[], startIndex = 0): Promise<void> {
  await setupPlayer();
  usePlayerStore.getState().setQueue(tracks, startIndex);

  await TrackPlayer.reset();
  await TrackPlayer.add(tracks.map(toPlayerTrack));
  if (startIndex > 0) await TrackPlayer.skip(startIndex);
  await TrackPlayer.play();
}

/** Toca uma unica faixa, substituindo a fila. */
export async function playTrack(track: Track): Promise<void> {
  await playQueue([track], 0);
}

export async function pause(): Promise<void> {
  await TrackPlayer.pause();
}

export async function resume(): Promise<void> {
  await TrackPlayer.play();
}

/** Para e esvazia a fila. */
export async function stop(): Promise<void> {
  await TrackPlayer.reset();
  usePlayerStore.getState().reset();
}

export async function togglePlay(): Promise<void> {
  const { isPlaying } = usePlayerStore.getState();
  if (isPlaying) await pause();
  else await resume();
}

/** Posiciona a reproducao, em segundos. */
export async function seekTo(position: number): Promise<void> {
  await TrackPlayer.seekTo(position);
  usePlayerStore.getState().setProgress(position);
}

export async function skipToNext(): Promise<void> {
  try {
    await TrackPlayer.skipToNext();
  } catch {
    // Fim da fila sem repeat: o Track Player recusa o pulo. Nao e erro.
  }
}

// ------------------------------------------------------------------- a fila

/** A fila atual, na ordem de reproducao. */
export function getQueue(): Track[] {
  return usePlayerStore.getState().queue;
}

/** Substitui a fila inteira sem comecar a tocar. */
export async function setQueue(tracks: Track[], startIndex = 0): Promise<void> {
  await setupPlayer();
  usePlayerStore.getState().setQueue(tracks, startIndex);

  await TrackPlayer.reset();
  await TrackPlayer.add(tracks.map(toPlayerTrack));
  if (startIndex > 0) await TrackPlayer.skip(startIndex);
}

/** Acrescenta uma faixa ao fim da fila. */
export async function addToQueue(track: Track): Promise<void> {
  await setupPlayer();
  usePlayerStore.getState().addToQueue(track);
  await TrackPlayer.add(toPlayerTrack(track));
}

export async function removeFromQueue(index: number): Promise<void> {
  usePlayerStore.getState().removeFromQueue(index);
  try {
    await TrackPlayer.remove([index]);
  } catch (error) {
    console.warn('[player] não foi possível remover da fila:', error);
  }
}

/** Reordena a fila — usado pelo drag & drop da tela de fila (Issue #11). */
export async function moveQueueItem(from: number, to: number): Promise<void> {
  usePlayerStore.getState().moveQueueItem(from, to);
  try {
    await TrackPlayer.move(from, to);
  } catch (error) {
    console.warn('[player] não foi possível reordenar a fila:', error);
  }
}

export async function clearQueue(): Promise<void> {
  usePlayerStore.getState().clearQueue();
  await TrackPlayer.reset();
}

// ------------------------------------------------------------------- modos

/** Traduz o modo do store para o do Track Player. */
const REPEAT_MODES: Record<StoreRepeatMode, RepeatMode> = {
  off: RepeatMode.Off,
  track: RepeatMode.Track,
  queue: RepeatMode.Queue,
};

/**
 * Alterna o repeat entre off, track e queue.
 *
 * A regra fica no Track Player, nao em JS: e ele que decide o que tocar quando
 * uma faixa acaba, e uma decisao paralela do lado do JS chegaria tarde demais
 * — depois do silencio entre as faixas.
 */
export async function cycleRepeatMode(): Promise<RepeatMode> {
  usePlayerStore.getState().cycleRepeatMode();
  const mode = REPEAT_MODES[usePlayerStore.getState().repeatMode];
  await TrackPlayer.setRepeatMode(mode);
  return mode;
}

/**
 * Liga ou desliga o modo aleatorio.
 *
 * A faixa atual nao e interrompida: so o que vem depois dela e reordenado, via
 * `removeUpcomingTracks` + `add`. Reconstruir a fila inteira com `reset` cortaria
 * o audio no meio.
 */
export async function toggleShuffle(): Promise<boolean> {
  await setupPlayer();
  usePlayerStore.getState().toggleShuffle();

  const { queue, currentIndex, shuffleMode } = usePlayerStore.getState();
  const upcoming = queue.slice(currentIndex + 1);

  await TrackPlayer.removeUpcomingTracks();
  if (upcoming.length > 0) {
    await TrackPlayer.add(upcoming.map(toPlayerTrack));
  }

  return shuffleMode;
}

/**
 * Volta uma faixa — ou reinicia a atual.
 *
 * Depois de 3 segundos tocados, "anterior" reinicia a faixa em vez de voltar,
 * que e a convencao de todo player de musica. A regra vive aqui, e nao no
 * store, porque este e o unico caminho por onde o comando passa — venha ele de
 * um toque na tela ou da tela de bloqueio.
 */
export async function skipToPrevious(): Promise<void> {
  const { position } = usePlayerStore.getState();
  if (position > 3) {
    await seekTo(0);
    return;
  }
  try {
    await TrackPlayer.skipToPrevious();
  } catch {
    await seekTo(0);
  }
}
