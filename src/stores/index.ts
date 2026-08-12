// Stores de estado global (Zustand).
export { useLibraryStore } from '@/stores/library-store';
export type {
  LibraryActions,
  LibraryState,
  LibraryStore,
  ScanProgress,
} from '@/stores/library-store';

export { usePlayerStore } from '@/stores/player-store';
export type { PlayerActions, PlayerState, PlayerStore, RepeatMode } from '@/stores/player-store';

export { usePlaylistStore } from '@/stores/playlist-store';
export type { PlaylistActions, PlaylistState, PlaylistStore } from '@/stores/playlist-store';

export {
  CROSSFADE_MAX_SECONDS,
  CROSSFADE_MIN_SECONDS,
  useSettingsStore,
} from '@/stores/settings-store';
export type {
  SettingsActions,
  SettingsState,
  SettingsStore,
  SleepTimer,
  SleepTimerOption,
} from '@/stores/settings-store';
