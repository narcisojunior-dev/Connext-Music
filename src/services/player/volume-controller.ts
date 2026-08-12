import TrackPlayer from 'react-native-track-player';

import { fadeMultiplier, replayGain } from '@/services/player/audio-levels';
import { useSettingsStore } from '@/stores/settings-store';
import type { Track } from '@/types/track';

/** Diferença mínima que justifica falar com o player. */
const EPSILON = 0.02;

/** Passos e intervalo do fade-out do sleep timer. */
const SLEEP_FADE_STEPS = 20;
const SLEEP_FADE_MS = 3000;

/**
 * Dono do volume do player.
 *
 * Três coisas querem mexer no mesmo `setVolume` — normalização, fade de fim de
 * faixa e fade-out do sleep timer — e sem um lugar único a última a escrever
 * ganharia. Aqui elas se combinam por multiplicação, e só o resultado vai para
 * o player.
 *
 * `setVolume` é uma chamada pela ponte a cada atualização de progresso (1×/s).
 * O `EPSILON` evita repetir a chamada quando nada mudou de forma audível.
 */
export function createVolumeController() {
  let applied = 1;
  let sleepFade = 1;

  async function push(value: number): Promise<void> {
    const clamped = Math.min(1, Math.max(0, value));
    if (Math.abs(clamped - applied) < EPSILON && clamped !== 0 && applied !== 0) return;

    applied = clamped;
    try {
      await TrackPlayer.setVolume(clamped);
    } catch (error) {
      // Volume é um refinamento: se a ponte recusar, a música continua.
      console.warn('[player] não foi possível ajustar o volume:', error);
    }
  }

  return {
    /** Recalcula o volume para a posição atual da faixa. */
    async update(track: Track | null, position: number, duration: number): Promise<void> {
      const settings = useSettingsStore.getState();

      const gain = settings.normalizationEnabled
        ? replayGain(track?.rawMetadata as Record<string, unknown> | undefined)
        : 1;

      const fade = settings.fadeEnabled
        ? fadeMultiplier(position, duration, settings.fadeSeconds)
        : 1;

      await push(gain * fade * sleepFade);
    },

    /**
     * Baixa o volume até zero ao longo de alguns segundos.
     *
     * O sleep timer usa isto antes de pausar: cortar o som de uma vez acorda
     * quem estava quase dormindo, que é justamente quem ligou o timer.
     */
    async fadeOut(): Promise<void> {
      for (let step = SLEEP_FADE_STEPS - 1; step >= 0; step--) {
        sleepFade = step / SLEEP_FADE_STEPS;
        await push(applied * (step / (step + 1)));
        await new Promise((resolve) => setTimeout(resolve, SLEEP_FADE_MS / SLEEP_FADE_STEPS));
      }
      sleepFade = 0;
      await push(0);
    },

    /** Devolve o volume ao normal. Chamado ao voltar a tocar depois do timer. */
    reset(): void {
      sleepFade = 1;
    },
  };
}

export type VolumeController = ReturnType<typeof createVolumeController>;
