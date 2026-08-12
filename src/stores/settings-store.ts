import { create } from 'zustand';

/** Opcoes do sleep timer, em minutos. `endOfTrack` para ao terminar a faixa atual. */
export type SleepTimerOption = 5 | 15 | 30 | 45 | 60 | 'endOfTrack';

export interface SleepTimer {
  option: SleepTimerOption;
  /** Momento em que o timer expira. Null quando a opcao e `endOfTrack`. */
  expiresAt: number | null;
}

export interface SettingsState {
  /** Crossfade entre faixas. `crossfadeSeconds` so vale quando ligado. */
  crossfadeEnabled: boolean;
  /** 0 a 5 segundos (Issue #18). */
  crossfadeSeconds: number;
  /** Normalizacao de volume entre faixas. */
  normalizationEnabled: boolean;
  /** Pular silencio no inicio e fim das faixas. */
  skipSilenceEnabled: boolean;
  /** Timer ativo, ou null quando nenhum foi programado. */
  sleepTimer: SleepTimer | null;
}

export interface SettingsActions {
  setCrossfadeEnabled: (enabled: boolean) => void;
  /** Fixa o valor entre 0 e 5s — a UI e um slider, mas a regra vive aqui. */
  setCrossfadeSeconds: (seconds: number) => void;
  setNormalizationEnabled: (enabled: boolean) => void;
  setSkipSilenceEnabled: (enabled: boolean) => void;
  startSleepTimer: (option: SleepTimerOption) => void;
  cancelSleepTimer: () => void;
  resetToDefaults: () => void;
}

export type SettingsStore = SettingsState & SettingsActions;

export const CROSSFADE_MIN_SECONDS = 0;
export const CROSSFADE_MAX_SECONDS = 5;

const defaults: SettingsState = {
  crossfadeEnabled: false,
  crossfadeSeconds: 2,
  normalizationEnabled: false,
  skipSilenceEnabled: false,
  sleepTimer: null,
};

/**
 * Preferencias do usuario (Issue #18).
 *
 * Os defaults sao conservadores de proposito: crossfade e normalizacao alteram
 * o audio, e quem quiser esse comportamento vai liga-lo. A persistencia entra
 * na Issue #7 — por enquanto as preferencias voltam ao padrao a cada abertura.
 */
export const useSettingsStore = create<SettingsStore>()((set) => ({
  ...defaults,

  setCrossfadeEnabled: (crossfadeEnabled) => set({ crossfadeEnabled }),

  setCrossfadeSeconds: (seconds) =>
    set({
      crossfadeSeconds: Math.min(CROSSFADE_MAX_SECONDS, Math.max(CROSSFADE_MIN_SECONDS, seconds)),
    }),

  setNormalizationEnabled: (normalizationEnabled) => set({ normalizationEnabled }),
  setSkipSilenceEnabled: (skipSilenceEnabled) => set({ skipSilenceEnabled }),

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
