/**
 * Volume-alvo quando a normalização está ligada, em dB.
 *
 * -14 LUFS é a referência que streaming usa hoje; ReplayGain 2.0 grava o ganho
 * já relativo a ela, então na prática basta aplicar o valor da tag.
 */
const HEADROOM_CEILING = 1;

/** Limite inferior do volume aplicado — abaixo disso a faixa some. */
const MIN_GAIN = 0.1;

/**
 * Ganho de normalização de uma faixa, como multiplicador de volume (0 a 1).
 *
 * Lê o ReplayGain gravado no arquivo. **Não** analisa o áudio: medir volume de
 * verdade exigiria decodificar cada faixa inteira, o que não cabe num scan de
 * biblioteca no telefone. Arquivos sem a tag ficam em 1 (volume cheio), que é o
 * comportamento certo — na dúvida, não mexer.
 *
 * Aceita as duas grafias que aparecem na prática: `REPLAYGAIN_TRACK_GAIN` em
 * Vorbis/FLAC e no TXXX do ID3, e `replaygain_track_gain` em minúsculas.
 */
export function replayGain(raw: Record<string, unknown> | undefined): number {
  if (!raw) return 1;

  const value =
    pick(raw, 'REPLAYGAIN_TRACK_GAIN') ??
    pick(raw, 'REPLAYGAIN_ALBUM_GAIN') ??
    pick(raw, 'replaygain_track_gain') ??
    pick(raw, 'replaygain_album_gain');

  if (value === null) return 1;

  const db = parseGainDb(value);
  if (db === null) return 1;

  // dB para amplitude linear. Ganho positivo e mantido abaixo de 1: o player
  // nao tem headroom acima do volume cheio, e amplificar so causaria clipping.
  const linear = Math.pow(10, db / 20);
  return Math.min(HEADROOM_CEILING, Math.max(MIN_GAIN, linear));
}

function pick(raw: Record<string, unknown>, key: string): string | null {
  const value = raw[key];
  return typeof value === 'string' ? value : null;
}

/** `"-7.25 dB"` → `-7.25`. Devolve null para qualquer coisa que não seja número. */
export function parseGainDb(value: string): number | null {
  const match =
    /^\s*([+-]?\d+(?:\.\d+)?)\s*dB\s*$/i.exec(value) ?? /^\s*([+-]?\d+(?:\.\d+)?)\s*$/.exec(value);
  if (!match) return null;

  const db = Number(match[1]);
  // Ganhos absurdos indicam tag corrompida; ignorar e mais seguro que estourar
  // ou emudecer a faixa.
  if (!Number.isFinite(db) || Math.abs(db) > 60) return null;
  return db;
}

/**
 * Volume durante o fade de fim de faixa.
 *
 * Recebe a posição e devolve a fração do volume base que deve estar tocando.
 * Fora da janela de fade devolve 1.
 *
 * Isto é um **fade**, não um crossfade: o Track Player mantém uma única
 * instância de player, então não há como sobrepor o fim de uma faixa ao começo
 * da outra. O que dá para fazer — e o que isto faz — é baixar o volume no fim e
 * subir de volta no início da seguinte, o que tira o corte seco entre faixas.
 */
export function fadeMultiplier(position: number, duration: number, fadeSeconds: number): number {
  if (fadeSeconds <= 0 || duration <= 0) return 1;

  // Faixa curta demais para caber o fade sem passar a maior parte dela em
  // volume reduzido.
  if (duration < fadeSeconds * 3) return 1;

  const remaining = duration - position;
  if (remaining >= fadeSeconds) return 1;
  if (remaining <= 0) return 0;

  return remaining / fadeSeconds;
}
