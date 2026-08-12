import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

const SRC = join(import.meta.dirname, '..', 'src');

function sourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...sourceFiles(full));
    else if (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx')) out.push(full);
  }
  return out;
}

/**
 * O mapeamento tátil é lido do fonte, não executado: `expo-haptics` é um módulo
 * nativo e não carrega fora do app. O que precisa ser garantido aqui é a
 * *intenção* declarada na Issue #16 — leve para transporte, média para uma ação
 * que muda dados, forte para toque longo — e que nenhum componente contorne o
 * módulo e escolha a própria intensidade.
 */
describe('retorno tátil', () => {
  const haptics = readFileSync(join(SRC, 'utils', 'haptics.ts'), 'utf8');

  it('mapeia cada intenção para a intensidade da spec', () => {
    const intent = (name: string) => {
      const body = haptics.slice(haptics.indexOf(`export function ${name}`));
      const match = /ImpactFeedbackStyle\.(\w+)/.exec(body);
      assert.ok(match, `${name} não chama impact()`);
      return match[1];
    };

    assert.equal(intent('hapticControl'), 'Light');
    assert.equal(intent('hapticCommit'), 'Medium');
    assert.equal(intent('hapticLongPress'), 'Heavy');
  });

  it('nunca deixa uma falha de vibração derrubar a ação', () => {
    assert.match(haptics, /impactAsync\([^)]*\)\.catch\(/);
  });

  it('é o único lugar do app que chama expo-haptics', () => {
    const offenders = sourceFiles(SRC)
      .filter((f) => !f.endsWith(join('utils', 'haptics.ts')))
      .filter((f) => readFileSync(f, 'utf8').includes('expo-haptics'))
      .map((f) => f.slice(SRC.length + 1));

    assert.deepEqual(
      offenders,
      [],
      `estes arquivos escolhem a própria intensidade em vez de usar utils/haptics: ${offenders.join(', ')}`,
    );
  });
});
