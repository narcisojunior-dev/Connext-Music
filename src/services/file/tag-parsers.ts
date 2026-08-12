/**
 * Leitura de tags de audio direto dos bytes do arquivo.
 *
 * Tudo aqui e funcao pura sobre `Uint8Array`: nenhuma I/O, nenhuma dependencia
 * de runtime. Escrevemos em vez de usar `music-metadata` (precisa de streams do
 * Node) ou `jsmediatags` (precisa do react-native-fs) — os dois exigiriam
 * polyfills pesados no Hermes para ler o que sao, no fim, alguns cabecalhos bem
 * documentados.
 *
 * Formatos: ID3v2.2/2.3/2.4 e ID3v1 (MP3), atomos iTunes (M4A/MP4) e
 * VORBIS_COMMENT (FLAC).
 */

export interface RawPicture {
  /** Bytes da imagem, como estao embutidos no arquivo. */
  data: Uint8Array;
  /** `image/jpeg`, `image/png`, ... */
  mimeType: string;
}

export interface ParsedTags {
  title: string | null;
  artist: string | null;
  album: string | null;
  genre: string | null;
  year: number | null;
  trackNumber: number | null;
  /** Em segundos. `null` quando o formato nao permite calcular sem decodificar. */
  duration: number | null;
  picture: RawPicture | null;
  /** Campos crus, para debug. */
  raw: Record<string, string>;
}

export function emptyTags(): ParsedTags {
  return {
    title: null,
    artist: null,
    album: null,
    genre: null,
    year: null,
    trackNumber: null,
    duration: null,
    picture: null,
    raw: {},
  };
}

// ---------------------------------------------------------------- decodificacao

/** Latin-1: cada byte e um code point. */
function decodeLatin1(bytes: Uint8Array): string {
  let out = '';
  for (let i = 0; i < bytes.length; i++) out += String.fromCharCode(bytes[i]);
  return out;
}

/**
 * UTF-8 sem depender de `TextDecoder`, que nao esta garantido no Hermes.
 * Sequencias invalidas viram U+FFFD em vez de derrubar o parse.
 */
function decodeUtf8(bytes: Uint8Array): string {
  let out = '';
  let i = 0;
  while (i < bytes.length) {
    const b = bytes[i];
    let cp: number;
    let extra: number;

    if (b < 0x80) {
      cp = b;
      extra = 0;
    } else if ((b & 0xe0) === 0xc0) {
      cp = b & 0x1f;
      extra = 1;
    } else if ((b & 0xf0) === 0xe0) {
      cp = b & 0x0f;
      extra = 2;
    } else if ((b & 0xf8) === 0xf0) {
      cp = b & 0x07;
      extra = 3;
    } else {
      out += '�';
      i++;
      continue;
    }

    if (i + extra >= bytes.length) {
      out += '�';
      break;
    }
    for (let k = 1; k <= extra; k++) {
      const cont = bytes[i + k];
      if ((cont & 0xc0) !== 0x80) {
        cp = -1;
        break;
      }
      cp = (cp << 6) | (cont & 0x3f);
    }
    i += extra + 1;

    if (cp < 0) {
      out += '�';
    } else if (cp > 0xffff) {
      cp -= 0x10000;
      out += String.fromCharCode(0xd800 + (cp >> 10), 0xdc00 + (cp & 0x3ff));
    } else {
      out += String.fromCharCode(cp);
    }
  }
  return out;
}

/** UTF-16 com BOM opcional; sem BOM assume big-endian (ID3v2 encoding 2). */
function decodeUtf16(bytes: Uint8Array, defaultBigEndian: boolean): string {
  let offset = 0;
  let bigEndian = defaultBigEndian;

  if (bytes.length >= 2) {
    if (bytes[0] === 0xff && bytes[1] === 0xfe) {
      bigEndian = false;
      offset = 2;
    } else if (bytes[0] === 0xfe && bytes[1] === 0xff) {
      bigEndian = true;
      offset = 2;
    }
  }

  let out = '';
  for (let i = offset; i + 1 < bytes.length; i += 2) {
    out += String.fromCharCode(
      bigEndian ? (bytes[i] << 8) | bytes[i + 1] : (bytes[i + 1] << 8) | bytes[i],
    );
  }
  return out;
}

/** Encodings do ID3v2: 0 latin1, 1 UTF-16+BOM, 2 UTF-16BE, 3 UTF-8. */
function decodeByEncoding(encoding: number, bytes: Uint8Array): string {
  switch (encoding) {
    case 1:
      return decodeUtf16(bytes, false);
    case 2:
      return decodeUtf16(bytes, true);
    case 3:
      return decodeUtf8(bytes);
    default:
      return decodeLatin1(bytes);
  }
}

/** Remove terminadores nulos e espacos das pontas. */
function clean(value: string): string {
  return value.replace(/\0+$/g, '').trim();
}

function readUint32BE(b: Uint8Array, o: number): number {
  return ((b[o] << 24) | (b[o + 1] << 16) | (b[o + 2] << 8) | b[o + 3]) >>> 0;
}

function readUint32LE(b: Uint8Array, o: number): number {
  return ((b[o + 3] << 24) | (b[o + 2] << 16) | (b[o + 1] << 8) | b[o]) >>> 0;
}

function ascii(b: Uint8Array, o: number, len: number): string {
  return decodeLatin1(b.subarray(o, o + len));
}

/**
 * Inteiro "synchsafe": 7 bits uteis por byte.
 *
 * O ID3 usa isso para que o tamanho do tag nunca contenha 0xFF seguido de bits
 * altos, o que um decodificador de MP3 confundiria com o inicio de um frame.
 */
function readSynchsafe(b: Uint8Array, o: number): number {
  return (
    ((b[o] & 0x7f) << 21) | ((b[o + 1] & 0x7f) << 14) | ((b[o + 2] & 0x7f) << 7) | (b[o + 3] & 0x7f)
  );
}

/** Extrai o primeiro numero de textos como "3", "3/12" ou "03". */
function parseLeadingInt(value: string | null): number | null {
  if (!value) return null;
  const match = value.match(/\d+/);
  if (!match) return null;
  const n = parseInt(match[0], 10);
  return Number.isFinite(n) ? n : null;
}

/** Lista canonica de generos do ID3v1, usada por TCON "(17)" e pelo atomo `gnre`. */
const ID3V1_GENRES = [
  'Blues',
  'Classic Rock',
  'Country',
  'Dance',
  'Disco',
  'Funk',
  'Grunge',
  'Hip-Hop',
  'Jazz',
  'Metal',
  'New Age',
  'Oldies',
  'Other',
  'Pop',
  'R&B',
  'Rap',
  'Reggae',
  'Rock',
  'Techno',
  'Industrial',
  'Alternative',
  'Ska',
  'Death Metal',
  'Pranks',
  'Soundtrack',
  'Euro-Techno',
  'Ambient',
  'Trip-Hop',
  'Vocal',
  'Jazz+Funk',
  'Fusion',
  'Trance',
  'Classical',
  'Instrumental',
  'Acid',
  'House',
  'Game',
  'Sound Clip',
  'Gospel',
  'Noise',
  'AlternRock',
  'Bass',
  'Soul',
  'Punk',
  'Space',
  'Meditative',
  'Instrumental Pop',
  'Instrumental Rock',
  'Ethnic',
  'Gothic',
  'Darkwave',
  'Techno-Industrial',
  'Electronic',
  'Pop-Folk',
  'Eurodance',
  'Dream',
  'Southern Rock',
  'Comedy',
  'Cult',
  'Gangsta',
  'Top 40',
  'Christian Rap',
  'Pop/Funk',
  'Jungle',
  'Native American',
  'Cabaret',
  'New Wave',
  'Psychadelic',
  'Rave',
  'Showtunes',
  'Trailer',
  'Lo-Fi',
  'Tribal',
  'Acid Punk',
  'Acid Jazz',
  'Polka',
  'Retro',
  'Musical',
  'Rock & Roll',
  'Hard Rock',
];

/** Resolve "(17)" e "17" para o nome do genero; devolve o texto original se nao casar. */
function resolveGenre(value: string | null): string | null {
  if (!value) return null;
  const numeric = value.match(/^\(?(\d+)\)?$/);
  if (numeric) {
    return ID3V1_GENRES[parseInt(numeric[1], 10)] ?? value;
  }
  return value;
}

// ------------------------------------------------------------------------ ID3

/** Nomes de frame por versao: ID3v2.2 usa 3 letras, v2.3+ usa 4. */
const ID3_FRAMES_V2 = {
  title: 'TT2',
  artist: 'TP1',
  album: 'TAL',
  genre: 'TCO',
  year: 'TYE',
  track: 'TRK',
  picture: 'PIC',
};
const ID3_FRAMES_V3 = {
  title: 'TIT2',
  artist: 'TPE1',
  album: 'TALB',
  genre: 'TCON',
  year: 'TYER',
  track: 'TRCK',
  picture: 'APIC',
};

/**
 * Le um tag ID3v2 do inicio do arquivo.
 *
 * Devolve `null` quando nao ha tag — o chamador entao tenta o ID3v1 do fim.
 */
export function parseId3v2(bytes: Uint8Array): ParsedTags | null {
  if (bytes.length < 10 || ascii(bytes, 0, 3) !== 'ID3') return null;

  const majorVersion = bytes[3];
  const flags = bytes[5];
  const tagSize = readSynchsafe(bytes, 6);
  const names = majorVersion <= 2 ? ID3_FRAMES_V2 : ID3_FRAMES_V3;
  const idLength = majorVersion <= 2 ? 3 : 4;
  const headerLength = majorVersion <= 2 ? 6 : 10;

  let offset = 10;
  // Extended header (v2.3+): pula o bloco antes do primeiro frame.
  if (majorVersion >= 3 && (flags & 0x40) !== 0 && bytes.length >= offset + 4) {
    const extSize = majorVersion === 4 ? readSynchsafe(bytes, offset) : readUint32BE(bytes, offset);
    offset += majorVersion === 4 ? extSize : extSize + 4;
  }

  const end = Math.min(bytes.length, 10 + tagSize);
  const tags = emptyTags();
  const text: Record<string, string> = {};

  while (offset + headerLength <= end) {
    const frameId = ascii(bytes, offset, idLength);
    // Padding: o resto do tag e zeros.
    if (frameId.charCodeAt(0) === 0) break;

    let frameSize: number;
    if (majorVersion <= 2) {
      frameSize = (bytes[offset + 3] << 16) | (bytes[offset + 4] << 8) | bytes[offset + 5];
    } else if (majorVersion === 4) {
      frameSize = readSynchsafe(bytes, offset + 4);
    } else {
      frameSize = readUint32BE(bytes, offset + 4);
    }

    const body = offset + headerLength;
    if (frameSize <= 0 || body + frameSize > end) break;
    const frame = bytes.subarray(body, body + frameSize);

    if (frameId === names.picture) {
      tags.picture = parseId3Picture(frame, majorVersion);
    } else if (frameId === 'TXXX' || frameId === 'TXX') {
      // TXXX carrega um par: descricao, NUL, valor. Caindo no ramo generico de
      // texto abaixo ele seria truncado no NUL, e o valor se perderia — e e no
      // valor que vive o ReplayGain.
      const pair = parseUserTextFrame(frame);
      if (pair) text[pair.description] = pair.value;
    } else if (frameId.startsWith('T')) {
      const value = clean(decodeByEncoding(frame[0], frame.subarray(1)));
      if (value) text[frameId] = value;
    }

    offset = body + frameSize;
  }

  tags.title = text[names.title] ?? null;
  tags.artist = text[names.artist] ?? null;
  tags.album = text[names.album] ?? null;
  tags.genre = resolveGenre(text[names.genre] ?? null);
  tags.trackNumber = parseLeadingInt(text[names.track] ?? null);
  // v2.4 troca TYER por TDRC, que traz a data ISO completa.
  tags.year = parseLeadingInt(text[names.year] ?? text.TDRC ?? null);
  tags.raw = text;

  return tags;
}

/**
 * TXXX / TXX — texto definido pelo usuario.
 *
 * O formato e `encoding | descricao | NUL | valor`, com o NUL em uma ou duas
 * bytes conforme o encoding. A descricao vira a chave, em maiusculas, para o
 * chamador procurar por nome (`REPLAYGAIN_TRACK_GAIN`) sem saber a ordem em que
 * os frames apareceram.
 */
function parseUserTextFrame(frame: Uint8Array): { description: string; value: string } | null {
  if (frame.length < 2) return null;

  const encoding = frame[0];
  const body = frame.subarray(1);
  // UTF-16 (0x01 e 0x02) termina a descricao com dois bytes zero alinhados.
  const wide = encoding === 1 || encoding === 2;

  let split = -1;
  if (wide) {
    for (let i = 0; i + 1 < body.length; i += 2) {
      if (body[i] === 0 && body[i + 1] === 0) {
        split = i;
        break;
      }
    }
  } else {
    split = body.indexOf(0);
  }
  if (split < 0) return null;

  const description = clean(decodeByEncoding(encoding, body.subarray(0, split)));
  const value = clean(decodeByEncoding(encoding, body.subarray(split + (wide ? 2 : 1))));
  if (!description || !value) return null;

  return { description: description.toUpperCase(), value };
}

/** APIC (v2.3+) e PIC (v2.2). */
function parseId3Picture(frame: Uint8Array, majorVersion: number): RawPicture | null {
  if (frame.length < 4) return null;
  const encoding = frame[0];
  let offset = 1;
  let mimeType: string;

  if (majorVersion <= 2) {
    // v2.2 guarda um codigo de 3 letras ("JPG", "PNG") no lugar do MIME.
    const format = ascii(frame, offset, 3).toLowerCase();
    mimeType = format === 'png' ? 'image/png' : 'image/jpeg';
    offset += 3;
  } else {
    let stop = offset;
    while (stop < frame.length && frame[stop] !== 0) stop++;
    mimeType = ascii(frame, offset, stop - offset) || 'image/jpeg';
    offset = stop + 1;
  }

  offset += 1; // tipo da imagem (capa frontal, verso, ...)

  // A descricao termina em nulo — de 2 bytes quando o texto e UTF-16.
  const wide = encoding === 1 || encoding === 2;
  if (wide) {
    while (offset + 1 < frame.length && !(frame[offset] === 0 && frame[offset + 1] === 0))
      offset += 2;
    offset += 2;
  } else {
    while (offset < frame.length && frame[offset] !== 0) offset++;
    offset += 1;
  }

  if (offset >= frame.length) return null;
  return { data: frame.subarray(offset), mimeType: normalizeMime(mimeType) };
}

/** ID3v1: 128 bytes fixos no fim do arquivo. */
export function parseId3v1(tail: Uint8Array): ParsedTags | null {
  if (tail.length < 128) return null;
  const start = tail.length - 128;
  if (ascii(tail, start, 3) !== 'TAG') return null;

  const field = (offset: number, len: number) => clean(ascii(tail, start + offset, len)) || null;
  const tags = emptyTags();

  tags.title = field(3, 30);
  tags.artist = field(33, 30);
  tags.album = field(63, 30);
  tags.year = parseLeadingInt(field(93, 4));

  // ID3v1.1 usa os dois ultimos bytes do comentario para o numero da faixa.
  const comment = tail.subarray(start + 97, start + 127);
  if (comment[28] === 0 && comment[29] !== 0) tags.trackNumber = comment[29];

  const genreIndex = tail[start + 127];
  tags.genre = ID3V1_GENRES[genreIndex] ?? null;

  return tags;
}

/**
 * Duracao de um MP3 a partir do primeiro frame.
 *
 * E uma **estimativa**: assume bitrate constante, entao um arquivo VBR sai
 * errado. Serve para a lista nao mostrar 0:00; a duracao exata vem do motor de
 * audio na Issue #8, que decodifica o arquivo de verdade.
 */
export function estimateMp3Duration(bytes: Uint8Array, audioBytes: number): number | null {
  const V1_L3 = [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320];
  const V2_L3 = [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160];
  const RATES: Record<number, number[]> = {
    3: [44100, 48000, 32000],
    2: [22050, 24000, 16000],
    0: [11025, 12000, 8000],
  };

  for (let i = 0; i + 3 < bytes.length; i++) {
    if (bytes[i] !== 0xff || (bytes[i + 1] & 0xe0) !== 0xe0) continue;

    const versionBits = (bytes[i + 1] >> 3) & 0x03;
    const layerBits = (bytes[i + 1] >> 1) & 0x03;
    const bitrateIndex = (bytes[i + 2] >> 4) & 0x0f;
    const rateIndex = (bytes[i + 2] >> 2) & 0x03;

    if (versionBits === 1 || layerBits !== 1) continue; // versao reservada, ou nao e Layer III
    if (bitrateIndex === 0 || bitrateIndex === 0x0f || rateIndex === 3) continue;

    const table = versionBits === 3 ? V1_L3 : V2_L3;
    const kbps = table[bitrateIndex];
    const sampleRate = RATES[versionBits]?.[rateIndex];
    if (!kbps || !sampleRate) continue;

    return Math.round((audioBytes * 8) / (kbps * 1000));
  }
  return null;
}

// ------------------------------------------------------------------- MP4/M4A

/** Atomos iTunes: os nomes comecam com 0xA9 (o "©" do padrao). */
const COPYRIGHT = String.fromCharCode(0xa9);
const MP4_ATOMS: Record<string, keyof ParsedTags | 'trackRaw'> = {
  [`${COPYRIGHT}nam`]: 'title',
  [`${COPYRIGHT}ART`]: 'artist',
  [`${COPYRIGHT}alb`]: 'album',
  [`${COPYRIGHT}gen`]: 'genre',
  [`${COPYRIGHT}day`]: 'year',
};

interface Box {
  type: string;
  start: number;
  end: number;
  /** Inicio do conteudo, ja depois do cabecalho. */
  contentStart: number;
}

/** Percorre os boxes MP4 de um intervalo. Nao desce nos filhos. */
function readBoxes(bytes: Uint8Array, from: number, to: number): Box[] {
  const boxes: Box[] = [];
  let offset = from;

  while (offset + 8 <= to) {
    let size = readUint32BE(bytes, offset);
    const type = ascii(bytes, offset + 4, 4);
    let headerSize = 8;

    if (size === 1) {
      // Tamanho de 64 bits. Ignoramos os 4 bytes altos: arquivos de audio nao
      // chegam a 4 GB, e ler 53 bits com bitwise em JS nao e confiavel.
      if (offset + 16 > to) break;
      size = readUint32BE(bytes, offset + 12);
      headerSize = 16;
    } else if (size === 0) {
      size = to - offset; // vai ate o fim
    }

    if (size < headerSize || offset + size > to) break;
    boxes.push({ type, start: offset, end: offset + size, contentStart: offset + headerSize });
    offset += size;
  }

  return boxes;
}

function findBox(boxes: Box[], type: string): Box | undefined {
  return boxes.find((b) => b.type === type);
}

export function parseMp4(bytes: Uint8Array): ParsedTags | null {
  const top = readBoxes(bytes, 0, bytes.length);
  if (!findBox(top, 'ftyp')) return null;

  const tags = emptyTags();
  const moov = findBox(top, 'moov');
  if (!moov) return tags;

  const moovChildren = readBoxes(bytes, moov.contentStart, moov.end);

  // Duracao exata, direto do cabecalho do filme.
  const mvhd = findBox(moovChildren, 'mvhd');
  if (mvhd) {
    const version = bytes[mvhd.contentStart];
    const base = mvhd.contentStart + 4; // versao + flags
    if (version === 0 && mvhd.end - base >= 12) {
      const timescale = readUint32BE(bytes, base + 8);
      const duration = readUint32BE(bytes, base + 12);
      if (timescale > 0) tags.duration = Math.round(duration / timescale);
    } else if (version === 1 && mvhd.end - base >= 28) {
      const timescale = readUint32BE(bytes, base + 16);
      // Duracao de 64 bits: usamos os 32 bits baixos, suficientes para audio.
      const duration = readUint32BE(bytes, base + 24);
      if (timescale > 0) tags.duration = Math.round(duration / timescale);
    }
  }

  const udta = findBox(moovChildren, 'udta');
  if (!udta) return tags;

  const meta = findBox(readBoxes(bytes, udta.contentStart, udta.end), 'meta');
  if (!meta) return tags;

  // `meta` e um FullBox: 4 bytes de versao/flags antes dos filhos.
  const ilst = findBox(readBoxes(bytes, meta.contentStart + 4, meta.end), 'ilst');
  if (!ilst) return tags;

  const raw: Record<string, string> = {};

  for (const atom of readBoxes(bytes, ilst.contentStart, ilst.end)) {
    const dataBox = findBox(readBoxes(bytes, atom.contentStart, atom.end), 'data');
    if (!dataBox) continue;

    // data: versao/flags(4) + reservado(4), depois o payload.
    const typeIndicator = readUint32BE(bytes, dataBox.contentStart) & 0xffffff;
    const payload = bytes.subarray(dataBox.contentStart + 8, dataBox.end);

    if (atom.type === 'covr') {
      // 13 = JPEG, 14 = PNG, conforme o indicador de tipo do proprio box.
      tags.picture = {
        data: payload,
        mimeType: typeIndicator === 14 ? 'image/png' : 'image/jpeg',
      };
      continue;
    }

    if (atom.type === 'trkn' && payload.length >= 4) {
      tags.trackNumber = (payload[2] << 8) | payload[3];
      continue;
    }

    if (atom.type === 'gnre' && payload.length >= 2) {
      // Indice de genero em 1-based, herdado do ID3v1.
      tags.genre = ID3V1_GENRES[((payload[0] << 8) | payload[1]) - 1] ?? null;
      continue;
    }

    const field = MP4_ATOMS[atom.type];
    if (!field) continue;

    const value = clean(decodeUtf8(payload));
    if (!value) continue;
    raw[atom.type] = value;

    if (field === 'year') tags.year = parseLeadingInt(value);
    else if (field === 'title') tags.title = value;
    else if (field === 'artist') tags.artist = value;
    else if (field === 'album') tags.album = value;
    else if (field === 'genre') tags.genre = tags.genre ?? value;
  }

  tags.raw = raw;
  return tags;
}

// ---------------------------------------------------------------------- FLAC

export function parseFlac(bytes: Uint8Array): ParsedTags | null {
  if (bytes.length < 4 || ascii(bytes, 0, 4) !== 'fLaC') return null;

  const tags = emptyTags();
  const raw: Record<string, string> = {};
  let offset = 4;

  while (offset + 4 <= bytes.length) {
    const isLast = (bytes[offset] & 0x80) !== 0;
    const blockType = bytes[offset] & 0x7f;
    const length = (bytes[offset + 1] << 16) | (bytes[offset + 2] << 8) | bytes[offset + 3];
    const body = offset + 4;
    if (body + length > bytes.length) break;

    if (blockType === 0 && length >= 18) {
      // STREAMINFO: sample rate em 20 bits e total de amostras em 36, ambos
      // desalinhados. Usamos aritmetica em vez de bitwise porque 36 bits nao
      // cabem nos 32 do operador `|`.
      const sampleRate =
        (bytes[body + 10] << 12) | (bytes[body + 11] << 4) | (bytes[body + 12] >> 4);
      const totalSamples =
        (bytes[body + 13] & 0x0f) * 2 ** 32 +
        bytes[body + 14] * 2 ** 24 +
        bytes[body + 15] * 2 ** 16 +
        bytes[body + 16] * 2 ** 8 +
        bytes[body + 17];
      if (sampleRate > 0 && totalSamples > 0) tags.duration = Math.round(totalSamples / sampleRate);
    } else if (blockType === 4) {
      parseVorbisComment(bytes.subarray(body, body + length), raw);
    } else if (blockType === 6) {
      tags.picture = parseFlacPicture(bytes.subarray(body, body + length));
    }

    offset = body + length;
    if (isLast) break;
  }

  const get = (key: string) => raw[key] ?? null;
  tags.title = get('TITLE');
  tags.artist = get('ARTIST');
  tags.album = get('ALBUM');
  tags.genre = get('GENRE');
  tags.year = parseLeadingInt(get('DATE') ?? get('YEAR'));
  tags.trackNumber = parseLeadingInt(get('TRACKNUMBER'));
  tags.raw = raw;

  return tags;
}

/** Campos `CHAVE=valor` em UTF-8, com tamanhos em little-endian. */
function parseVorbisComment(block: Uint8Array, out: Record<string, string>): void {
  if (block.length < 4) return;
  let offset = 4 + readUint32LE(block, 0); // pula o vendor string
  if (offset + 4 > block.length) return;

  const count = readUint32LE(block, offset);
  offset += 4;

  for (let i = 0; i < count && offset + 4 <= block.length; i++) {
    const length = readUint32LE(block, offset);
    offset += 4;
    if (offset + length > block.length) break;

    const entry = decodeUtf8(block.subarray(offset, offset + length));
    offset += length;

    const eq = entry.indexOf('=');
    if (eq > 0) {
      const key = entry.slice(0, eq).toUpperCase();
      const value = clean(entry.slice(eq + 1));
      if (value && !(key in out)) out[key] = value;
    }
  }
}

function parseFlacPicture(block: Uint8Array): RawPicture | null {
  if (block.length < 32) return null;
  let offset = 4; // tipo da imagem

  const mimeLength = readUint32BE(block, offset);
  offset += 4;
  if (offset + mimeLength > block.length) return null;
  const mimeType = ascii(block, offset, mimeLength);
  offset += mimeLength;

  const descLength = readUint32BE(block, offset);
  offset += 4 + descLength;
  offset += 16; // largura, altura, profundidade, cores indexadas
  if (offset + 4 > block.length) return null;

  const dataLength = readUint32BE(block, offset);
  offset += 4;
  if (offset + dataLength > block.length) return null;

  return { data: block.subarray(offset, offset + dataLength), mimeType: normalizeMime(mimeType) };
}

/** Normaliza MIME types e adivinha pelo magic number quando ele vem vazio ou errado. */
function normalizeMime(mimeType: string): string {
  const value = mimeType.trim().toLowerCase();
  if (value === 'image/jpg' || value === 'jpg' || value === 'jpeg') return 'image/jpeg';
  if (value === 'png') return 'image/png';
  return value || 'image/jpeg';
}

/** Extensao de arquivo para uma capa, a partir do MIME. */
export function pictureExtension(picture: RawPicture): string {
  if (picture.mimeType === 'image/png') return '.png';
  if (picture.mimeType === 'image/webp') return '.webp';
  return '.jpg';
}
