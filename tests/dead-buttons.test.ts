import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

const SRC = join(import.meta.dirname, '..', 'src');

/**
 * Telas onde um botão inerte é intencional.
 *
 * A galeria do design system existe para mostrar a aparência dos componentes;
 * ligar cada exemplo a uma ação de verdade não teria sentido.
 */
const ALLOWED = [join('app', 'design-system.tsx')];

function screenFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...screenFiles(full));
    else if (entry.name.endsWith('.tsx')) out.push(full);
  }
  return out;
}

/**
 * Botões que não fazem nada.
 *
 * Um `IconButton` sem `onPress` renderiza normal, responde ao toque com a
 * animação de pressionado e não faz nada — então parece funcionar e passa
 * despercebido em revisão. Foi assim que o botão da fila de reprodução ficou
 * inerte da Issue #11 até um usuário reclamar.
 *
 * O teste lê o fonte porque o problema é justamente a ausência de uma prop:
 * não há comportamento para exercitar, só código para inspecionar.
 */
describe('botões inertes', () => {
  it('todo IconButton de tela tem ação', () => {
    const offenders: string[] = [];

    for (const file of screenFiles(SRC)) {
      const relative = file.slice(SRC.length + 1);
      if (ALLOWED.some((allowed) => relative.endsWith(allowed))) continue;

      const source = readFileSync(file, 'utf8');
      // Cada `<IconButton ... />` completo, incluindo os quebrados em linhas.
      for (const match of source.matchAll(/<IconButton\b([\s\S]*?)\/>/g)) {
        if (match[1].includes('onPress')) continue;

        const line = source.slice(0, match.index).split('\n').length;
        const label = /accessibilityLabel="([^"]+)"/.exec(match[1])?.[1] ?? '(sem rótulo)';
        offenders.push(`${relative}:${line} — "${label}"`);
      }
    }

    assert.deepEqual(
      offenders,
      [],
      `estes botões respondem ao toque mas não fazem nada:\n  ${offenders.join('\n  ')}`,
    );
  });
});
