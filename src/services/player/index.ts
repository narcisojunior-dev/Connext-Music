// Integracao com o Track Player: servico de playback e fila.
export { playbackService, setupPlayer } from '@/services/player/playback-service';
export {
  pause,
  playQueue,
  playTrack,
  resume,
  seekTo,
  skipToNext,
  skipToPrevious,
  stop,
  togglePlay,
} from '@/services/player/queue-manager';
