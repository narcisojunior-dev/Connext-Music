import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { JUMP_SECONDS } from '@/services/player/constants';

/**
 * Regras de limite dos saltos de 10s.
 *
 * `skipForward`/`skipBackward` do queue-manager conversam com o Track Player,
 * que não existe no Node. O que importa testar aqui é a **decisão** — para onde
 * o salto leva —, então ela é reproduzida a partir das mesmas constantes. Se a
 * regra mudar no queue-manager sem mudar aqui, os dois passam a divergir; o
 * comportamento real com áudio é conferido no simulador.
 */
function forwardTarget(position: number, duration: number): number | 'next' {
  const target = position + JUMP_SECONDS;
  if (duration > 0 && target >= duration) return 'next';
  return target;
}

function backwardTarget(position: number): number {
  return Math.max(0, position - JUMP_SECONDS);
}

describe('salto para frente', () => {
  test('avança exatamente o intervalo no meio da faixa', () => {
    assert.equal(forwardTarget(30, 200), 40);
  });

  test('passar do fim vira "próxima faixa" em vez de posição inválida', () => {
    // Sem isso o player buscaria um ponto que não existe e a faixa cortaria.
    assert.equal(forwardTarget(195, 200), 'next');
    assert.equal(forwardTarget(190, 200), 'next', 'exatamente no fim também');
  });

  test('sem duração conhecida, avança sem tentar adivinhar o fim', () => {
    // Duração 0 acontece com MP3 cuja estimativa falhou (ver Issue #6).
    assert.equal(forwardTarget(10, 0), 20);
  });
});

describe('salto para trás', () => {
  test('retrocede exatamente o intervalo', () => {
    assert.equal(backwardTarget(30), 20);
  });

  test('nunca passa de zero', () => {
    assert.equal(backwardTarget(5), 0);
    assert.equal(backwardTarget(0), 0);
  });

  test('não troca de faixa — isso é papel do botão "anterior"', () => {
    // O contraste importa: "anterior" antes de 3s volta uma faixa; −10s nunca.
    assert.equal(backwardTarget(1), 0);
  });
});

describe('intervalo', () => {
  test('é 10 segundos, como os botões do player anunciam', () => {
    // O salto vive só dentro do app: a tela de bloqueio mostra faixa
    // anterior/próxima. O número no botão vem desta constante.
    assert.equal(JUMP_SECONDS, 10);
  });
});
