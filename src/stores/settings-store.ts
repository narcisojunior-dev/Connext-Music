import { create } from 'zustand';

import { loadSettings, saveSettings } from '@/services/storage/settings-storage';

/** Opcoes do sleep timer, em minutos. `endOfTrack` para ao terminar a faixa atual. */
export type SleepTimerOption = 5 | 15 | 30 | 45 | 60 | 'endOfTrack';

export interface SleepTimer {
  option: SleepTimerOption;
  /** Momento em que o timer expira. Null quando a opcao e `endOfTrack`. */
  expiresAt: number | null;
}

export interface SettingsState {
  /**
   * Fade no fim da faixa. `fadeSeconds` so vale quando ligado.
   *
   * A issue pedia "crossfade", mas o Track Player 4.1.2 mantem uma unica
   * instancia de player e nao tem API para sobrepor duas faixas — o que da para
   * entregar e o fade. O nome aqui segue o que o codigo faz, e nao o que a
   * issue pediu, porque a diferenca e audivel.
   */
  fadeEnabled: boolean;
  /** 0 a 5 segundos. */
  fadeSeconds: number;
  /** Normalizacao de volume via ReplayGain gravado no arquivo. */
  normalizationEnabled: boolean;
  /** Timer ativo, ou null quando nenhum foi programado. */
  sleepTimer: SleepTimer | null;
}

export interface SettingsActions {
  hydrate: () => Promise<void>;
  setFadeEnabled: (enabled: boolean) => void;
  /** Fixa o valor entre 0 e 5s — a UI e um slider, mas a regra vive aqui. */
  setFadeSeconds: (seconds: number) => void;
  setNormalizationEnabled: (enabled: boolean) => void;
  startSleepTimer: (option: SleepTimerOption) => void;
  cancelSleepTimer: () => void;
  resetToDefaults: () => void;
}

export type SettingsStore = SettingsState & SettingsActions;

export const FADE_MIN_SECONDS = 0;
export const FADE_MAX_SECONDS = 5;

const defaults: SettingsState = {
  fadeEnabled: false,
  fadeSeconds: 2,
  normalizationEnabled: false,
  sleepTimer: null,
};

/** Campos gravados. O `sleepTimer` fica de fora: ver `settings-storage`. */
export type PersistedSettings = Omit<SettingsState, 'sleepTimer'>;

/**
 * Preferencias do usuario (Issue #18).
 *
 * Os defaults sao conservadores de proposito: fade e normalizacao alteram o
 * audio, e quem quiser esse comportamento vai liga-lo.
 */
let hydration: Promise<void> | null = null;

export const useSettingsStore = create<SettingsStore>()((set) => ({
  ...defaults,

  // Mesmo padrao de deduplicacao dos outros stores: duas telas podem pedir a
  // hidratacao ao mesmo tempo, e a leitura mais lenta nao pode sobrescrever o
  // que o usuario ja mudou.
  hydrate: () => {
    hydration ??= loadSettings()
      .then((stored) => {
        if (stored) set(stored);
      })
      .finally(() => {
        hydration = null;
      });
    return hydration;
  },

  setFadeEnabled: (fadeEnabled) => set({ fadeEnabled }),

  setFadeSeconds: (seconds) =>
    set({
      fadeSeconds: Math.min(FADE_MAX_SECONDS, Math.max(FADE_MIN_SECONDS, seconds)),
    }),

  setNormalizationEnabled: (normalizationEnabled) => set({ normalizationEnabled }),

  startSleepTimer: (option) =>
    set({
      sleepTimer: {
        option,
        expiresAt: option === 'endOfTrack' ? null : Date.now() + option * 60_000,
      },
    }),

  cancelSleepTimer: () => set({ sleepTimer: null }),
  resetToDefaults: () => set(defaults),
}));

/**
 * Grava as preferencias a cada mudanca.
 *
 * Sem debounce, ao contrario da biblioteca: sao quatro campos e a mudanca vem
 * de um toque humano num interruptor, nunca em rajada.
 */
useSettingsStore.subscribe((state, previous) => {
  if (
    state.fadeEnabled === previous.fadeEnabled &&
    state.fadeSeconds === previous.fadeSeconds &&
    state.normalizationEnabled === previous.normalizationEnabled
  ) {
    return;
  }

  void saveSettings({
    fadeEnabled: state.fadeEnabled,
    fadeSeconds: state.fadeSeconds,
    normalizationEnabled: state.normalizationEnabled,
  });
});
