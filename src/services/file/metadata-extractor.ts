import { Directory, File, Paths } from 'expo-file-system';

import {
  emptyTags,
  estimateMp3Duration,
  parseFlac,
  parseId3v1,
  parseId3v2,
  parseMp4,
  pictureExtension,
  type ParsedTags,
  type RawPicture,
} from '@/services/file/tag-parsers';

/** Preenchimento quando a tag nao traz o campo. Exportado para o scanner poder
 * reconhecer que o valor e um preenchimento, e nao algo que o usuario escreveu. */
export const ARTIST_UNKNOWN = 'Artista Desconhecido';
export const ALBUM_UNKNOWN = 'Álbum Desconhecido';

/**
 * Metadados prontos para virar uma `Track`, ja com os fallbacks aplicados.
 *
 * Diferente de `ParsedTags`, que reflete o que o arquivo realmente tem (e por
 * isso e todo nullable), aqui titulo, artista, album e genero sao sempre
 * string: quem consome isto e a UI, e ela nunca deve precisar decidir o que
 * mostrar quando falta uma tag.
 */
export interface TrackMetadata {
  title: string;
  artist: string;
  album: string;
  genre: string;
  year: number | null;
  trackNumber: number | null;
  /** Em segundos; 0 quando nao foi possivel determinar. */
  duration: number;
  /** Caminho da capa em cache, ou null. */
  artwork: string | null;
  raw: Record<string, string>;
}

/**
 * Quanto do inicio do arquivo ler para procurar tags.
 *
 * Tags ID3 e atomos iTunes vivem no comeco, e capas embutidas raramente passam
 * de algumas centenas de KB. Ler 1MB em vez do arquivo inteiro evita carregar
 * um FLAC de 40MB na memoria so para descobrir o titulo — com 500 faixas, a
 * diferenca e entre alguns MB e vinte gigabytes de leitura.
 */
const HEADER_BYTES = 1024 * 1024;

/** ID3v1 fica nos ultimos 128 bytes do arquivo. */
const ID3V1_BYTES = 128;

/** Onde as capas extraidas sao guardadas. */
const ARTWORK_DIRECTORY = 'artworks';

/** Le no maximo `length` bytes a partir de `offset`, sem carregar o arquivo todo. */
function readChunk(file: File, offset: number, length: number): Uint8Array | null {
  if (length <= 0) return null;
  let handle;
  try {
    handle = file.open();
    handle.offset = offset;
    return handle.readBytes(length);
  } catch (error) {
    console.warn(`[metadata] não foi possível ler ${file.name}:`, error);
    return null;
  } finally {
    handle?.close();
  }
}

/**
 * Le as tags de um arquivo de audio.
 *
 * Nunca lanca: um arquivo corrompido devolve tags vazias e o chamador cai nos
 * fallbacks. Isso e proposital — um unico arquivo estranho no meio da pasta nao
 * pode impedir a biblioteca inteira de carregar.
 */
export function readTags(file: File, extension: string): ParsedTags {
  const size = file.size ?? 0;
  const head = readChunk(file, 0, Math.min(HEADER_BYTES, size));
  if (!head) return emptyTags();

  try {
    switch (extension) {
      case '.flac': {
        return parseFlac(head) ?? emptyTags();
      }

      case '.m4a':
      case '.mp4':
      case '.aac': {
        // AAC costuma vir em contêiner MP4; se nao for, o parse devolve null.
        const mp4 = parseMp4(head);
        if (mp4) return mp4;
        return readId3(file, head, size);
      }

      default:
        return readId3(file, head, size);
    }
  } catch (error) {
    // Um parser que tropeça em bytes inesperados nao pode derrubar o scan.
    console.warn(`[metadata] falha ao interpretar ${file.name}:`, error);
    return emptyTags();
  }
}

/** ID3v2 no inicio; se nao houver, ID3v1 no fim. Estima a duracao do MP3. */
function readId3(file: File, head: Uint8Array, size: number): ParsedTags {
  const v2 = parseId3v2(head);
  const tags =
    v2 ??
    (size >= ID3V1_BYTES
      ? parseId3v1(readChunk(file, size - ID3V1_BYTES, ID3V1_BYTES) ?? new Uint8Array(0))
      : null) ??
    emptyTags();

  if (tags.duration === null) {
    tags.duration = estimateMp3Duration(head, size);
  }
  return tags;
}

/**
 * Salva a capa embutida no cache e devolve o caminho.
 *
 * Vai em `Caches/` e nao em `Documents/`: e conteudo reconstruivel a partir do
 * arquivo original, entao o iOS pode apaga-lo quando o armazenamento apertar
 * sem que o usuario perca nada.
 *
 * Se a capa da faixa ja existe, reaproveita — o `trackId` muda quando o arquivo
 * muda, entao um cache existente e sempre da versao atual.
 */
export function saveArtwork(picture: RawPicture, trackId: string): string | null {
  try {
    const directory = new Directory(Paths.cache, ARTWORK_DIRECTORY);
    if (!directory.exists) {
      directory.create({ intermediates: true });
    }

    const target = new File(directory, `${trackId}${pictureExtension(picture)}`);
    if (target.exists) return target.uri;

    target.create();
    target.write(picture.data);
    return target.uri;
  } catch (error) {
    console.warn(`[metadata] não foi possível salvar a capa de ${trackId}:`, error);
    return null;
  }
}

/** Apaga o cache de capas (usado pelos Ajustes, Issue #18). */
export function clearArtworkCache(): void {
  try {
    const directory = new Directory(Paths.cache, ARTWORK_DIRECTORY);
    if (directory.exists) directory.delete();
  } catch (error) {
    console.warn('[metadata] não foi possível limpar o cache de capas:', error);
  }
}

/**
 * Metadados prontos para virar uma `Track`, com os fallbacks ja aplicados.
 *
 * `fallbackTitle` vem de `cleanFileName` — e o que aparece quando o arquivo nao
 * tem tag nenhuma, que e o caso comum de musica baixada solta.
 */
export function extractMetadata(
  file: File,
  extension: string,
  trackId: string,
  fallbackTitle: string,
): TrackMetadata {
  const tags = readTags(file, extension);

  return {
    title: tags.title || fallbackTitle,
    artist: tags.artist || ARTIST_UNKNOWN,
    album: tags.album || ALBUM_UNKNOWN,
    genre: tags.genre || '',
    year: tags.year,
    trackNumber: tags.trackNumber,
    duration: tags.duration ?? 0,
    artwork: tags.picture ? saveArtwork(tags.picture, trackId) : null,
    raw: tags.raw,
  };
}
