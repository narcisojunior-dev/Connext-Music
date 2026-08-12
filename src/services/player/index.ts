// Integracao com o Track Player: servico de playback e fila.
export { playbackService, setupPlayer } from '@/services/player/playback-service';
export {
  addToQueue,
  clearQueue,
  cycleRepeatMode,
  getQueue,
  moveQueueItem,
  pause,
  playQueue,
  playTrack,
  removeFromQueue,
  resume,
  seekTo,
  setQueue,
  skipToNext,
  skipToPrevious,
  stop,
  toggleShuffle,
  togglePlay,
} from '@/services/player/queue-manager';
