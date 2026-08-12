// Stub do expo-file-system para os testes das funcoes puras do scanner.
//
// As funcoes sob teste (isAudioFile, cleanFileName, ...) nao tocam o disco; o
// stub existe so para o modulo carregar no Node. A varredura de verdade e
// verificada no simulador, nao aqui.
export class Directory {
  constructor(...parts) {
    this.uri = parts.join('/');
    this.name = String(parts.at(-1) ?? '');
  }
  list() {
    return [];
  }
}
export class File {
  constructor(...parts) {
    this.uri = parts.join('/');
    this.name = String(parts.at(-1) ?? '');
  }
}
export const Paths = { document: 'file:///mock/Documents', cache: 'file:///mock/Caches' };
