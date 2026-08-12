import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { carLayout, MIN_CONTROL_SIZE } from '@/services/car-mode/layout';

/** iPhone 17 Pro em retrato e o mesmo aparelho deitado. */
const PHONE_PORTRAIT = { width: 402, height: 874 };
const PHONE_LANDSCAPE = { width: 874, height: 402 };

describe('layout do modo carro', () => {
  it('reconhece a orientação pela proporção da tela', () => {
    assert.equal(carLayout(PHONE_PORTRAIT.width, PHONE_PORTRAIT.height).orientation, 'portrait');
    assert.equal(carLayout(PHONE_LANDSCAPE.width, PHONE_LANDSCAPE.height).orientation, 'landscape');
  });

  it('põe capa e controles lado a lado só em paisagem', () => {
    assert.equal(carLayout(PHONE_PORTRAIT.width, PHONE_PORTRAIT.height).sideBySide, false);
    assert.equal(carLayout(PHONE_LANDSCAPE.width, PHONE_LANDSCAPE.height).sideBySide, true);
  });

  it('nunca desenha um controle abaixo do alvo mínimo', () => {
    // Inclui uma tela absurdamente pequena: o piso é o que garante que o botão
    // continua acertável sem olhar.
    for (const [w, h] of [
      [PHONE_PORTRAIT.width, PHONE_PORTRAIT.height],
      [PHONE_LANDSCAPE.width, PHONE_LANDSCAPE.height],
      [320, 480],
      [200, 200],
    ]) {
      const layout = carLayout(w, h);
      assert.ok(
        layout.primaryControlSize >= MIN_CONTROL_SIZE,
        `botão principal de ${layout.primaryControlSize}pt em ${w}×${h}`,
      );
      assert.ok(
        layout.secondaryControlSize >= MIN_CONTROL_SIZE,
        `botão secundário de ${layout.secondaryControlSize}pt em ${w}×${h}`,
      );
    }
  });

  it('o play/pause é maior que os vizinhos, ou igual no piso', () => {
    const layout = carLayout(PHONE_PORTRAIT.width, PHONE_PORTRAIT.height);
    assert.ok(layout.primaryControlSize >= layout.secondaryControlSize);
  });

  it('esconde a capa quando não sobra espaço para ela', () => {
    // Numa tela apertada os controles têm prioridade — é melhor ficar sem
    // imagem do que com botões que exigem mira.
    assert.equal(carLayout(320, 480).artworkSize, 0);
  });

  it('em retrato a capa deixa altura de sobra para a fila', () => {
    const layout = carLayout(PHONE_PORTRAIT.width, PHONE_PORTRAIT.height);
    const usado = layout.artworkSize + layout.primaryControlSize;
    // O resto vai para título, artista, barra superior e a lista de fila. Com
    // a capa em 42% da altura sobravam duas linhas de fila, o que não dá para
    // usar dirigindo.
    assert.ok(
      PHONE_PORTRAIT.height - usado > 380,
      `sobraram só ${PHONE_PORTRAIT.height - usado}pt para texto e fila`,
    );
  });

  it('mostra a capa num aparelho com espaço', () => {
    assert.ok(carLayout(PHONE_PORTRAIT.width, PHONE_PORTRAIT.height).artworkSize > 0);
  });

  it('a capa nunca ultrapassa o menor lado da tela', () => {
    for (const [w, h] of [
      [PHONE_PORTRAIT.width, PHONE_PORTRAIT.height],
      [PHONE_LANDSCAPE.width, PHONE_LANDSCAPE.height],
      [1024, 1366],
    ]) {
      const layout = carLayout(w, h);
      assert.ok(
        layout.artworkSize <= Math.min(w, h),
        `capa de ${layout.artworkSize}pt não cabe em ${w}×${h}`,
      );
    }
  });

  it('num tablet grande a capa cresce mas o botão para de crescer', () => {
    const phone = carLayout(PHONE_PORTRAIT.width, PHONE_PORTRAIT.height);
    const tablet = carLayout(1024, 1366);

    assert.ok(tablet.artworkSize > phone.artworkSize);
    // Acima do teto o botão só ocuparia tela sem ganhar precisão.
    assert.ok(tablet.primaryControlSize <= 140);
  });
});
