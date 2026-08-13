/**
 * Uma faixa da biblioteca — o registro central do app.
 *
 * Campos conforme a secao 3.1 do [Guia do Scanner iOS](../../docs/Guia_Scanner_iOS_Connext.md).
 * Cada faixa corresponde a um arquivo real em `Documents/`; o scanner (Issue #5)
 * produz esses objetos e a persistencia (Issue #7) os guarda entre sessoes.
 */
export interface Track {
  /** Hash do caminho + data de modificacao. Estavel entre scans do mesmo arquivo. */
  id: string;
  /** Caminho absoluto do arquivo. E o que o player abre. */
  url: string;

  title: string;
  artist: string;
  album: string;
  genre: string;
  year: number | null;
  trackNumber: number | null;
  /** Duracao em segundos. */
  duration: number;
  /** Caminho da capa em cache, ou null quando o arquivo nao tem artwork embutida. */
  artwork: string | null;

  // Metadados do arquivo
  fileName: string;
  /** Tamanho em bytes. */
  fileSize: number;
  /** Extensao com ponto: `.mp3`, `.flac`, ... */
  extension: string;
  /**
   * Pasta de origem, relativa a `Documents/`. `""` para faixas na raiz.
   *
   * O usuario ja organizou a colecao em pastas — `Rock/`, `MPB/1970/` — com um
   * criterio proprio que nenhuma tag reproduz. Guardar isto e o que permite
   * mostrar a biblioteca do jeito que ela esta no disco, em vez de so pelo que
   * as tags dizem.
   */
  folderPath: string;
  /** Timestamp da ultima modificacao. Junto do path, forma o `id` e detecta arquivos alterados. */
  modifiedDate: number;

  // Playback
  playCount: number;
  lastPlayedAt: number | null;
  isFavorite: boolean;
  /**
   * Quando a faixa entrou na biblioteca.
   *
   * Nao e o `modifiedDate` do arquivo: um arquivo copiado do iTunes preserva a
   * data original, entao musica antiga adicionada hoje apareceria como velha em
   * "Recentemente Adicionadas". Este campo e cravado no primeiro scan que ve a
   * faixa e preservado nos scans seguintes.
   */
  addedAt: number;

  /** Tags ID3 cruas, para debug e usos avancados. */
  rawMetadata?: Record<string, unknown>;
}

/** Extensoes de audio suportadas pelo scanner (Issue #5). */
export const SUPPORTED_EXTENSIONS = ['.mp3', '.m4a', '.flac', '.wav', '.aac', '.ogg'] as const;

export type SupportedExtension = (typeof SUPPORTED_EXTENSIONS)[number];
