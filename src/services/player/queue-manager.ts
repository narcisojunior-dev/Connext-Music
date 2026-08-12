import TrackPlayer, { type Track as RNTPTrack } from 'react-native-track-player';

import { setupPlayer } from '@/services/player/playback-service';
import { usePlayerStore } from '@/stores/player-store';
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

/**
 * Volta uma faixa — ou reinicia a atual.
 *
 * Depois de 3 segundos tocados, "anterior" reinicia a faixa em vez de voltar,
 * que e a convencao de todo player de musica. O limite vive no store, para a
 * regra ser a mesma independente de quem dispara o comando.
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
