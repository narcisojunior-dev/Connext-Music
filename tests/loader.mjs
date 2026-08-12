// Resolve, para o Node, o alias `@/` que o Metro resolve no app.
//
// Os testes rodam no runner nativo do Node (`node --test`), sem dependência de
// runtime: os arquivos sob teste são TypeScript puro, e o Node apaga os tipos
// sozinho. Componentes React continuam fora daqui — eles precisam de RNTL,
// que chega na Issue #26.
import { registerHooks } from 'node:module';
import { pathToFileURL } from 'node:url';

const SRC = new URL('../src/', import.meta.url).pathname;

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith('@/')) {
      return { url: pathToFileURL(`${SRC}${specifier.slice(2)}.ts`).href, shortCircuit: true };
    }
    return nextResolve(specifier, context);
  },
});
