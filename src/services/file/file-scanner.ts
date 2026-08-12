import { Directory, File, Paths } from 'expo-file-system';

import { extractMetadata } from '@/services/file/metadata-extractor';
import { SUPPORTED_EXTENSIONS, type Track } from '@/types/track';
import { generateTrackId } from '@/utils/id-generator';

export { SUPPORTED_EXTENSIONS };

/**
 * Arquivos menores que isto sao ignorados.
 *
 * Um audio de verdade nao cabe em 1KB. Esse tamanho pega downloads truncados e
 * os arquivos-fantasma de 0 byte que o iCloud Drive deixa para trás quando o
 * conteudo ainda nao foi baixado — os dois quebrariam o player mais tarde.
 */
export const MIN_FILE_SIZE = 1024;

/** Quantos arquivos processar antes de devolver o controle ao event loop. */
const YIELD_EVERY = 25;

export type ScanProgressCallback = (current: number, total: number, fileName: string) => void;

/** Pastas que nunca contem musica do usuario. */
const SKIP_DIRECTORIES = new Set([
  'node_modules',
  '.git',
  '__MACOSX',
  'Caches',
  'tmp',
  'DerivedData',
  'artworks', // nosso proprio cache de capas (Issue #6)
]);

/** `true` para arquivos com extensao de audio suportada. */
export function isAudioFile(fileName: string): boolean {
  const dot = fileName.lastIndexOf('.');
  if (dot <= 0) return false; // sem extensao, ou nome oculto tipo ".mp3"
  const ext = fileName.slice(dot).toLowerCase();
  return (SUPPORTED_EXTENSIONS as readonly string[]).includes(ext);
}

/** `true` para pastas que o scanner deve pular. */
export function shouldSkipDirectory(dirName: string): boolean {
  return SKIP_DIRECTORIES.has(dirName) || dirName.startsWith('.');
}

/**
 * Titulo de emergencia para arquivos sem tags ID3.
 *
 * `"01 - Nome_da_Musica.mp3"` vira `"Nome da Musica"`. Isto e so o fallback: a
 * Issue #6 passa a ler as tags reais e so cai aqui quando elas nao existem.
 */
export function cleanFileName(fileName: string): string {
  return fileName
    .replace(/\.[^/.]+$/, '') // extensao
    .replace(/^\d+\s*[-_.]\s*/, '') // numero da faixa no inicio: "01 - ", "03_"
    .replace(/[_-]+/g, ' ') // separadores viram espaco
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Percorre um diretorio recursivamente e devolve os arquivos de audio.
 *
 * So coleta — nao processa. Separar as duas fases e o que permite saber o total
 * de arquivos antes de comecar, e portanto reportar um progresso que vai de 0 a
 * 100 uma vez so, em vez de reiniciar a cada subpasta.
 */
export function collectAudioFiles(directory: Directory): File[] {
  const found: File[] = [];

  let entries;
  try {
    entries = directory.list();
  } catch (error) {
    // Pasta ilegivel (permissao, link quebrado): ignora e segue com as outras.
    console.warn(`[scanner] não foi possível ler ${directory.uri}:`, error);
    return found;
  }

  for (const entry of entries) {
    try {
      if (entry instanceof Directory) {
        if (!shouldSkipDirectory(entry.name)) {
          found.push(...collectAudioFiles(entry));
        }
        continue;
      }

      if (!isAudioFile(entry.name)) continue;
      if ((entry.size ?? 0) < MIN_FILE_SIZE) continue;

      found.push(entry);
    } catch (error) {
      // Um arquivo problematico nao pode derrubar a varredura inteira.
      console.warn(`[scanner] ignorando ${entry.name}:`, error);
    }
  }

  return found;
}

/**
 * Monta a `Track` de um arquivo de audio, lendo as tags embutidas.
 *
 * Quando o arquivo nao tem tags — caso comum de musica baixada solta — o titulo
 * vem do nome do arquivo e artista/album ficam como "Desconhecido".
 *
 * Devolve `null` quando o arquivo nao pode ser lido, para o scan seguir.
 */
export function processAudioFile(file: File): Track | null {
  try {
    const fileName = file.name;
    const modifiedDate = file.lastModified ?? 0;
    const dot = fileName.lastIndexOf('.');
    const extension = dot > 0 ? fileName.slice(dot).toLowerCase() : '';

    const id = generateTrackId(file.uri, modifiedDate);
    const metadata = extractMetadata(file, extension, id, cleanFileName(fileName) || fileName);

    return {
      id,
      url: file.uri,
      title: metadata.title,
      artist: metadata.artist,
      album: metadata.album,
      genre: metadata.genre,
      year: metadata.year,
      trackNumber: metadata.trackNumber,
      duration: metadata.duration,
      artwork: metadata.artwork,
      fileName,
      fileSize: file.size ?? 0,
      extension,
      modifiedDate,
      playCount: 0,
      lastPlayedAt: null,
      isFavorite: false,
      addedAt: Date.now(),
      rawMetadata: metadata.raw,
    };
  } catch (error) {
    console.warn(`[scanner] falha ao processar ${file.uri}:`, error);
    return null;
  }
}

/** Descarta faixas com `id` repetido, preservando a primeira ocorrencia. */
export function removeDuplicates(tracks: Track[]): Track[] {
  const seen = new Set<string>();
  return tracks.filter((track) => {
    if (seen.has(track.id)) return false;
    seen.add(track.id);
    return true;
  });
}

/** Devolve o controle ao event loop para o React conseguir pintar a tela. */
function yieldToEventLoop(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

export interface ScanResult {
  tracks: Track[];
  /** Arquivos encontrados que nao puderam ser processados. */
  failed: number;
  /** Duracao do scan em milissegundos. */
  elapsedMs: number;
  /** Faixas reaproveitadas da biblioteca anterior, sem reler as tags. */
  reused: number;
  /** Arquivos novos ou modificados que precisaram ser lidos. */
  processed: number;
  /** Faixas que sumiram do disco e sairam da biblioteca. */
  removed: number;
  /**
   * `id` antigo -> `id` novo, para arquivos que mudaram de conteudo.
   *
   * Quem guarda referencias por `id` (playlists) precisa disto para nao ficar
   * apontando para faixas que deixaram de existir.
   */
  remappedIds: Record<string, string>;
}

export interface ScanOptions {
  onProgress?: ScanProgressCallback;
  onComplete?: (tracks: Track[]) => void;
  /**
   * Biblioteca ja conhecida. Passando isto, o scan vira incremental: arquivos
   * inalterados sao reaproveitados em vez de reprocessados.
   */
  knownTracks?: Track[];
}

/**
 * Preserva o que e do usuario, nao do arquivo.
 *
 * `playCount`, `lastPlayedAt` e `isFavorite` nao vem das tags — sao historico
 * de uso. Ao reprocessar um arquivo (porque ele foi reeditado, por exemplo),
 * a faixa nova nasce zerada, e sem isto o usuario perderia os favoritos toda
 * vez que renomeasse uma tag.
 */
function carryUserData(track: Track, previous: Track | undefined): Track {
  if (!previous) return track;
  return {
    ...track,
    playCount: previous.playCount,
    lastPlayedAt: previous.lastPlayedAt,
    isFavorite: previous.isFavorite,
    // Preservado junto do resto: reescanear nao pode fazer a biblioteca
    // inteira parecer recem-adicionada.
    addedAt: previous.addedAt,
  };
}

/**
 * Varre a pasta `Documents/` do app e devolve as faixas encontradas.
 *
 * `Documents/` e a unica pasta onde o usuario consegue colocar musica (via
 * iTunes File Sharing ou o app Arquivos) — o sandbox do iOS bloqueia o resto.
 * `Library/` e `Caches/` ficam de fora de proposito: sao dados do app, nao do
 * usuario.
 *
 * A funcao e assincrona apesar de a API do `expo-file-system` ser sincrona.
 * Isso e deliberado: `list()` e `.size` bloqueiam a thread de JS, entao um scan
 * de mil arquivos congelaria a interface do inicio ao fim e a barra de
 * progresso so apareceria preenchida no ultimo frame. Cedendo o event loop a
 * cada {@link YIELD_EVERY} arquivos, o React consegue pintar os quadros
 * intermediarios e o progresso fica visivel.
 */
export async function scanMusicLibrary({
  onProgress,
  onComplete,
  knownTracks = [],
}: ScanOptions = {}): Promise<ScanResult> {
  const startedAt = Date.now();

  // Dois indices da biblioteca anterior, com papeis distintos:
  // por `id` diz "este arquivo esta identico" (o id ja embute a data de
  // modificacao); por `url` diz "este e o mesmo arquivo, mesmo que o conteudo
  // tenha mudado" — e o que permite carregar o historico de uso adiante.
  const knownById = new Map(knownTracks.map((t) => [t.id, t]));
  const knownByUrl = new Map(knownTracks.map((t) => [t.url, t]));
  const survivingIds = new Set<string>();
  const remappedIds: Record<string, string> = {};

  const tracks: Track[] = [];
  let failed = 0;
  let reused = 0;
  let processed = 0;

  const documents = new Directory(Paths.document);
  const files = collectAudioFiles(documents);
  const total = files.length;

  for (let i = 0; i < total; i++) {
    const file = files[i];
    const expectedId = generateTrackId(file.uri, file.lastModified ?? 0);
    const unchanged = knownById.get(expectedId);

    if (unchanged) {
      // Arquivo identico ao do ultimo scan: reaproveita e economiza a leitura
      // das tags, que e a parte cara do processo.
      tracks.push(unchanged);
      survivingIds.add(unchanged.id);
      reused++;
    } else {
      const previous = knownByUrl.get(file.uri);
      const track = processAudioFile(file);

      if (track) {
        tracks.push(carryUserData(track, previous));
        survivingIds.add(track.id);
        if (previous && previous.id !== track.id) {
          remappedIds[previous.id] = track.id;
        }
      } else {
        failed++;
      }
      processed++;
    }

    onProgress?.(i + 1, total, file.name);

    if ((i + 1) % YIELD_EVERY === 0) {
      await yieldToEventLoop();
    }
  }

  const unique = removeDuplicates(tracks);
  unique.sort((a, b) => a.title.localeCompare(b.title, 'pt-BR'));

  // O que estava salvo e nao sobreviveu: arquivo apagado ou modificado.
  const removed = knownTracks.filter((t) => !survivingIds.has(t.id)).length;

  onComplete?.(unique);

  return {
    tracks: unique,
    failed,
    elapsedMs: Date.now() - startedAt,
    reused,
    processed,
    removed,
    remappedIds,
  };
}
