// Resolve, para o Node, o que o Metro resolve no app: o alias `@/` e os
// modulos nativos, substituidos por stubs.
//
// Os testes rodam no runner nativo do Node (`node --test`), sem dependencia de
// runtime: os arquivos sob teste sao TypeScript puro e o Node apaga os tipos
// sozinho. Componentes React continuam fora daqui — eles precisam de RNTL, que
// chega na Issue #26.
import { registerHooks } from 'node:module';
import { pathToFileURL } from 'node:url';

const SRC = new URL('../src/', import.meta.url).pathname;

const STUBS = {
  'expo-file-system': new URL('./stubs/expo-file-system.mjs', import.meta.url).href,
  'expo-document-picker': new URL('./stubs/expo-document-picker.mjs', import.meta.url).href,
  '@react-native-async-storage/async-storage': new URL('./stubs/async-storage.mjs', import.meta.url)
    .href,
};

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (STUBS[specifier]) return { url: STUBS[specifier], shortCircuit: true };

    if (specifier.startsWith('@/')) {
      return { url: pathToFileURL(`${SRC}${specifier.slice(2)}.ts`).href, shortCircuit: true };
    }

    // Import relativo sem extensão: o Node ESM exige uma, o TypeScript não.
    // Completar aqui deixa os testes com o mesmo estilo do resto do código.
    if (specifier.startsWith('.') && !/\.[a-z]+$/i.test(specifier)) {
      return nextResolve(`${specifier}.ts`, context);
    }

    return nextResolve(specifier, context);
  },
});
