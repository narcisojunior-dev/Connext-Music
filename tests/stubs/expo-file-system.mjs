// Stub do expo-file-system.
//
// A varredura de verdade e verificada no simulador, nao aqui — mas as funcoes
// que decidem *o que fazer* com um arquivo (apagar, checar existencia) merecem
// teste, e para isso o stub mantem um sistema de arquivos em memoria.

/** Caminhos que "existem". O teste manipula por `mockFiles`. */
const arquivos = new Map();

export const mockFiles = {
  add(uri, size = 1024) {
    arquivos.set(uri, { size });
  },
  remove(uri) {
    arquivos.delete(uri);
  },
  has(uri) {
    return arquivos.has(uri);
  },
  clear() {
    arquivos.clear();
  },
  /** Faz a proxima exclusao falhar, para exercitar o caminho de erro. */
  failNextDelete: false,
};

export class Directory {
  constructor(...parts) {
    this.uri = parts.map((p) => (typeof p === 'string' ? p : p.uri)).join('/');
    this.name = String(parts.at(-1) ?? '');
  }
  get exists() {
    return true;
  }
  list() {
    return [];
  }
  create() {}
  delete() {}
}

export class File {
  constructor(...parts) {
    this.uri = parts.map((p) => (typeof p === 'string' ? p : p.uri)).join('/');
    this.name = String(parts.at(-1) ?? '');
  }
  get exists() {
    return arquivos.has(this.uri);
  }
  get size() {
    return arquivos.get(this.uri)?.size ?? null;
  }
  delete() {
    if (mockFiles.failNextDelete) {
      mockFiles.failNextDelete = false;
      throw new Error('permissao negada');
    }
    arquivos.delete(this.uri);
  }
  create() {
    arquivos.set(this.uri, { size: 0 });
  }
  copy(destino) {
    arquivos.set(destino.uri, arquivos.get(this.uri) ?? { size: 0 });
  }
  write() {}
  textSync() {
    return '';
  }
}

export const Paths = {
  document: 'file:///mock/Documents',
  cache: 'file:///mock/Caches',
  appleSharedContainers: {},
};
