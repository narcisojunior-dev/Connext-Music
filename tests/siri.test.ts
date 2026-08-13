import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { parsePendingCommand } from '@/services/siri/pending-command';

const NOW = 1_700_000_000_000;

/** Como o Swift grava: comando, argumento opcional e o instante do pedido. */
function command(payload: Record<string, unknown>): string {
  return JSON.stringify({ requestedAt: NOW, ...payload });
}

describe('comando pendente do Siri', () => {
  it('aceita os três comandos', () => {
    assert.deepEqual(parsePendingCommand(command({ command: 'playRandom' }), NOW), {
      command: 'playRandom',
    });
    assert.deepEqual(parsePendingCommand(command({ command: 'pause' }), NOW), {
      command: 'pause',
    });
    assert.deepEqual(
      parsePendingCommand(command({ command: 'playPlaylist', argument: 'p1' }), NOW),
      { command: 'playPlaylist', argument: 'p1' },
    );
  });

  it('descarta comando velho', () => {
    // Um atalho disparado e cancelado deixa o pedido gravado; sem o limite de
    // idade ele tocaria música dias depois, na próxima abertura do app.
    const old = command({ command: 'playRandom' });
    assert.equal(parsePendingCommand(old, NOW + 60_000), null);
  });

  it('aceita comando recém-gravado', () => {
    const fresh = command({ command: 'playRandom' });
    assert.ok(parsePendingCommand(fresh, NOW + 1_000));
  });

  it('recusa comando sem instante, que não dá para envelhecer', () => {
    assert.equal(parsePendingCommand(JSON.stringify({ command: 'pause' }), NOW), null);
  });

  it('recusa "tocar playlist" sem id', () => {
    assert.equal(parsePendingCommand(command({ command: 'playPlaylist' }), NOW), null);
    assert.equal(
      parsePendingCommand(command({ command: 'playPlaylist', argument: '' }), NOW),
      null,
    );
  });

  it('recusa comando desconhecido', () => {
    assert.equal(parsePendingCommand(command({ command: 'formatarDisco' }), NOW), null);
  });

  it('não engasga com lixo', () => {
    assert.equal(parsePendingCommand('não é json', NOW), null);
    assert.equal(parsePendingCommand('null', NOW), null);
    assert.equal(parsePendingCommand('[1,2]', NOW), null);
    assert.equal(parsePendingCommand('', NOW), null);
  });
});
