import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, test } from 'node:test';

const SOURCE = new URL('../src/services/player/playback-service.ts', import.meta.url).pathname;

/**
 * Guarda contra reintroduzir opções de categoria inválidas para `playback`.
 *
 * Isto inspeciona o texto do arquivo, e não o comportamento — incomum, mas
 * proporcional ao problema: a combinação errada faz o `setCategory` do iOS
 * lançar, o Track Player engole o erro com `try?`, e o sintoma só aparece em
 * aparelho real (sem áudio em segundo plano, sem controles na tela de
 * bloqueio). Nenhum teste de comportamento no Node pegaria isso, e o simulador
 * é permissivo demais para revelar.
 *
 * Regra, citada do header do SDK do iOS:
 * - `AllowAirPlay`: "Only valid with AVAudioSessionCategoryPlayAndRecord."
 * - `AllowBluetoothHFP`: "Only valid with AVAudioSessionCategoryPlayAndRecord."
 * - `AllowBluetoothA2DP`, em categorias de saída: "always implicitly true and
 *   cannot be changed" — ou seja, fones Bluetooth já funcionam sem opção.
 */
describe('sessão de áudio', () => {
  const source = readFileSync(SOURCE, 'utf8');

  /** Só o código, sem comentários — que explicam justamente por que não usamos essas opções. */
  const code = source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .filter((line) => !line.trim().startsWith('//'))
    .join('\n');

  test('usa a categoria playback', () => {
    assert.match(code, /iosCategory:\s*IOSCategory\.Playback/);
  });

  test('não passa opções válidas apenas para playAndRecord', () => {
    for (const invalida of ['AllowAirPlay', 'AllowBluetooth']) {
      assert.ok(
        !code.includes(invalida),
        `${invalida} só vale com playAndRecord; junto de playback faz setCategory lançar`,
      );
    }
  });

  test('declara os intervalos de salto junto das capabilities', () => {
    // Sem os intervalos, o iOS mostra o padrão de 15s nos botões da tela de
    // bloqueio, divergindo dos 10s que o app aplica.
    assert.match(code, /JumpForward/);
    assert.match(code, /forwardJumpInterval/);
    assert.match(code, /backwardJumpInterval/);
  });
});
