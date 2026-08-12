/**
 * Alvo mínimo de toque no modo carro, em pontos.
 *
 * As Human Interface Guidelines pedem 44pt para uso normal. Aqui o dobro: o
 * toque é feito sem olhar, com o carro em movimento, e errar um botão custa
 * mais atenção que qualquer economia de espaço na tela.
 */
export const MIN_CONTROL_SIZE = 88;

/** Teto do botão central — acima disso ele domina a tela sem ganhar precisão. */
const MAX_CONTROL_SIZE = 140;

/**
 * Espaco minimo para a capa valer a pena.
 *
 * Abaixo disso ela vira uma miniatura que nao ajuda a identificar nada de
 * relance, e o espaco rende mais como linha de fila.
 */
const ARTWORK_MIN_SPACE = 170;

export type CarOrientation = 'portrait' | 'landscape';

export interface CarLayout {
  orientation: CarOrientation;
  /** Lado da capa, em pontos. `0` quando não há espaço e ela deve sair. */
  artworkSize: number;
  /** Diâmetro do play/pause. */
  primaryControlSize: number;
  /** Diâmetro de anterior/próxima. */
  secondaryControlSize: number;
  /** A capa e os controles ficam lado a lado? */
  sideBySide: boolean;
}

/**
 * Dimensões dos elementos do modo carro para uma tela.
 *
 * Fica fora do componente por dois motivos: dá para testar as decisões sem
 * montar a árvore, e as regras de "quando a capa sai" ficam num lugar só, em
 * vez de espalhadas por condicionais no JSX.
 */
export function carLayout(width: number, height: number): CarLayout {
  const orientation: CarOrientation = width > height ? 'landscape' : 'portrait';
  const shortSide = Math.min(width, height);

  // Em paisagem a capa vai ao lado dos controles: empilhar deixaria as duas
  // metades espremidas na altura, que é justamente o que falta nessa
  // orientação.
  const sideBySide = orientation === 'landscape';

  const primaryControlSize = clamp(shortSide * 0.32, MIN_CONTROL_SIZE, MAX_CONTROL_SIZE);
  const secondaryControlSize = clamp(primaryControlSize * 0.78, MIN_CONTROL_SIZE, MAX_CONTROL_SIZE);

  // Em retrato a capa fica com uma fatia menor da altura do que em paisagem
  // pega da largura: e em retrato que a fila aparece, e com 42% da altura na
  // capa sobravam duas linhas — pouco para escolher faixa sem parar o carro.
  // Os controles tem prioridade sobre os dois: numa tela apertada e melhor
  // ficar sem imagem do que com botoes que exigem mira.
  const available = sideBySide ? width * 0.45 : height * 0.26;
  const artworkSize = available >= ARTWORK_MIN_SPACE ? Math.min(available, shortSide * 0.8) : 0;

  return { orientation, artworkSize, primaryControlSize, secondaryControlSize, sideBySide };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
