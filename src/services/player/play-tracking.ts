/**
 * Fração da faixa que precisa ser ouvida para contar como uma reprodução.
 *
 * Metade é o que a Issue #17 pede, e é o número que separa "ouviu" de "pulou":
 * contar no início inflaria a estatística com faixas descartadas no primeiro
 * segundo, e contar no fim perderia quem pula os últimos acordes.
 */
export const PLAY_COUNT_THRESHOLD = 0.5;

/** Duração mínima, em segundos, para uma faixa poder ser contada. */
const MIN_DURATION = 1;

export interface PlayProgress {
  trackId: string;
  /** Posição atual, em segundos. */
  position: number;
  /** Duração da faixa, em segundos. */
  duration: number;
}

/**
 * Decide se este avanço de progresso fecha uma reprodução.
 *
 * Separado do serviço de player de propósito: aqui não há nada de nativo, então
 * a regra pode ser testada sem simulador. O estado que ele guarda é só qual
 * faixa já foi contada — a mesma faixa não conta duas vezes por ficar passando
 * do meio para trás com o slider.
 */
export function createPlayTracker() {
  let countedTrackId: string | null = null;

  return {
    /**
     * Registra progresso. Devolve `true` **uma única vez** por reprodução, no
     * primeiro instante em que a faixa cruza o limiar.
     */
    onProgress({ trackId, position, duration }: PlayProgress): boolean {
      if (duration < MIN_DURATION) return false;
      if (countedTrackId === trackId) return false;
      if (position / duration < PLAY_COUNT_THRESHOLD) return false;

      countedTrackId = trackId;
      return true;
    },

    /**
     * Avisa que uma nova reprodução começou.
     *
     * Zera sempre, inclusive quando a faixa é a mesma: no `repeat one` a faixa
     * ativa não muda, e comparar o id faria a segunda volta nunca somar.
     */
    onPlaybackStart(): void {
      countedTrackId = null;
    },
  };
}

export type PlayTracker = ReturnType<typeof createPlayTracker>;
