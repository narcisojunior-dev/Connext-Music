/**
 * Constrói bytes de arquivos de áudio com tags reais, para exercitar os
 * parsers de `tag-parsers.ts`.
 *
 * Montar os bytes aqui, em vez de versionar arquivos binários, deixa explícito
 * **qual** tag cada caso tem — v2.3 vs v2.4, UTF-16 vs UTF-8, gênero numérico,
 * tag que mente sobre o próprio tamanho. Um `.mp3` gravado no repositório não
 * contaria essa história.
 */

/** JPEG mínimo: marcadores de início/fim válidos com payload no meio. */
export const JPEG = concat(
  bytes(0xff, 0xd8, 0xff, 0xe0),
  bytes(0x00, 0x10),
  latin1('JFIF\0'),
  latin1('ARTWORK-JPEG-PAYLOAD'.repeat(8)),
  bytes(0xff, 0xd9),
);

/** PNG mínimo: só o magic number e um payload. */
export const PNG = concat(
  bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a),
  latin1('PNG'.repeat(16)),
);

/** Frame MPEG1 Layer III, 128 kbps, 44.1 kHz — 417 bytes. */
const MP3_FRAME = concat(bytes(0xff, 0xfb, 0x90, 0x00), new Uint8Array(413));

export function mp3Audio(frames = 120): Uint8Array {
  return concat(...Array.from({ length: frames }, () => MP3_FRAME));
}

// ----------------------------------------------------------------- utilidades

export function bytes(...values: number[]): Uint8Array {
  return Uint8Array.from(values);
}

export function concat(...parts: Uint8Array[]): Uint8Array {
  const total = parts.reduce((n, p) => n + p.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}

export function latin1(text: string): Uint8Array {
  return Uint8Array.from([...text].map((c) => c.charCodeAt(0) & 0xff));
}

export function utf8(text: string): Uint8Array {
  const out: number[] = [];
  for (const char of text) {
    let cp = char.codePointAt(0)!;
    if (cp < 0x80) out.push(cp);
    else if (cp < 0x800) out.push(0xc0 | (cp >> 6), 0x80 | (cp & 0x3f));
    else if (cp < 0x10000)
      out.push(0xe0 | (cp >> 12), 0x80 | ((cp >> 6) & 0x3f), 0x80 | (cp & 0x3f));
    else {
      out.push(
        0xf0 | (cp >> 18),
        0x80 | ((cp >> 12) & 0x3f),
        0x80 | ((cp >> 6) & 0x3f),
        0x80 | (cp & 0x3f),
      );
    }
  }
  return Uint8Array.from(out);
}

/** UTF-16 little-endian com BOM, como o ID3v2 encoding 1. */
export function utf16le(text: string): Uint8Array {
  const out: number[] = [0xff, 0xfe];
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    out.push(code & 0xff, code >> 8);
  }
  return Uint8Array.from(out);
}

export function uint32be(value: number): Uint8Array {
  return bytes((value >>> 24) & 0xff, (value >>> 16) & 0xff, (value >>> 8) & 0xff, value & 0xff);
}

export function uint16be(value: number): Uint8Array {
  return bytes((value >>> 8) & 0xff, value & 0xff);
}

export function uint32le(value: number): Uint8Array {
  return bytes(value & 0xff, (value >>> 8) & 0xff, (value >>> 16) & 0xff, (value >>> 24) & 0xff);
}

/** Inteiro synchsafe do ID3: 7 bits úteis por byte. */
export function synchsafe(value: number): Uint8Array {
  return bytes((value >> 21) & 0x7f, (value >> 14) & 0x7f, (value >> 7) & 0x7f, value & 0x7f);
}

// ------------------------------------------------------------------------ ID3

type Id3Version = 3 | 4;

function id3Frame(id: string, payload: Uint8Array, version: Id3Version): Uint8Array {
  const size = version === 3 ? uint32be(payload.length) : synchsafe(payload.length);
  return concat(latin1(id), size, bytes(0, 0), payload);
}

/** Frame de texto. `encoding`: 0 latin1, 1 UTF-16+BOM, 3 UTF-8. */
export function textFrame(id: string, text: string, encoding = 0, version: Id3Version = 3) {
  const body = encoding === 1 ? utf16le(text) : encoding === 3 ? utf8(text) : latin1(text);
  return id3Frame(id, concat(bytes(encoding), body), version);
}

export function apicFrame(image: Uint8Array, mime = 'image/jpeg', version: Id3Version = 3) {
  const payload = concat(
    bytes(0), // encoding do texto
    latin1(mime),
    bytes(0),
    bytes(3), // tipo: capa frontal
    latin1('Cover'),
    bytes(0),
    image,
  );
  return id3Frame('APIC', payload, version);
}

export function id3v2Tag(frames: Uint8Array[], version: Id3Version = 3): Uint8Array {
  const body = concat(...frames);
  return concat(latin1('ID3'), bytes(version, 0, 0), synchsafe(body.length), body);
}

/** Bloco ID3v1 de 128 bytes, para colar no fim do arquivo. */
export function id3v1Tag(opts: {
  title: string;
  artist: string;
  album: string;
  year: string;
  track: number;
  genre: number;
}): Uint8Array {
  const field = (text: string, length: number) => {
    const out = new Uint8Array(length);
    out.set(latin1(text).subarray(0, length));
    return out;
  };
  const comment = new Uint8Array(30);
  comment[29] = opts.track; // ID3v1.1 guarda a faixa no último byte do comentário
  return concat(
    latin1('TAG'),
    field(opts.title, 30),
    field(opts.artist, 30),
    field(opts.album, 30),
    field(opts.year, 4),
    comment,
    bytes(opts.genre),
  );
}

// ------------------------------------------------------------------- MP4/M4A

export function box(type: string, payload: Uint8Array): Uint8Array {
  return concat(uint32be(payload.length + 8), latin1(type), payload);
}

/** Box `data` do iTunes. `typeIndicator`: 1 texto, 13 JPEG, 14 PNG, 0 binário. */
export function dataBox(payload: Uint8Array, typeIndicator = 1): Uint8Array {
  return box('data', concat(uint32be(typeIndicator), new Uint8Array(4), payload));
}

export function textAtom(name: string, value: string): Uint8Array {
  return box(name, dataBox(utf8(value)));
}

/**
 * Átomo `trkn`, que é binário e não texto: três uint16 — padding, número da
 * faixa e total. O parser lê a faixa nos bytes 2..3, então o padding importa.
 */
export function trackNumberAtom(track: number, total: number): Uint8Array {
  return box('trkn', dataBox(concat(uint16be(0), uint16be(track), uint16be(total)), 0));
}

/** `mvhd` versão 0, com timescale e duração dados. */
export function mvhd(timescale: number, duration: number): Uint8Array {
  return box(
    'mvhd',
    concat(
      new Uint8Array(4), // versão + flags
      new Uint8Array(8), // criação + modificação
      uint32be(timescale),
      uint32be(duration),
      new Uint8Array(80),
    ),
  );
}

export const FTYP = box('ftyp', concat(latin1('M4A '), uint32be(0), latin1('M4A mp42isom')));

// ---------------------------------------------------------------------- FLAC

export function flacBlock(type: number, payload: Uint8Array, last = false): Uint8Array {
  const header = bytes(
    (last ? 0x80 : 0) | type,
    (payload.length >> 16) & 0xff,
    (payload.length >> 8) & 0xff,
    payload.length & 0xff,
  );
  return concat(header, payload);
}

/**
 * STREAMINFO.
 *
 * Os bytes 10..17 empacotam 20 bits de sample rate + 3 de canais + 5 de bits
 * por amostra + 36 do total de amostras — nenhum campo cai em fronteira de
 * byte, e é justamente aí que um gerador descuidado erra.
 */
export function streamInfo(sampleRate: number, totalSamples: number, channels = 2, bps = 16) {
  return concat(
    new Uint8Array(10),
    bytes(
      (sampleRate >> 12) & 0xff,
      (sampleRate >> 4) & 0xff,
      ((sampleRate & 0x0f) << 4) | ((channels - 1) << 1) | ((bps - 1) >> 4),
      (((bps - 1) & 0x0f) << 4) | ((totalSamples / 2 ** 32) & 0x0f),
    ),
    uint32be(totalSamples >>> 0),
    new Uint8Array(16), // MD5
  );
}

export function vorbisComment(fields: [string, string][]): Uint8Array {
  const vendor = latin1('reference');
  const entries = fields.map(([key, value]) => {
    const entry = utf8(`${key}=${value}`);
    return concat(uint32le(entry.length), entry);
  });
  return concat(uint32le(vendor.length), vendor, uint32le(fields.length), ...entries);
}

export function flacPicture(image: Uint8Array, mime = 'image/jpeg'): Uint8Array {
  const mimeBytes = latin1(mime);
  const desc = latin1('Capa');
  return concat(
    uint32be(3), // tipo: capa frontal
    uint32be(mimeBytes.length),
    mimeBytes,
    uint32be(desc.length),
    desc,
    new Uint8Array(16), // largura, altura, profundidade, cores
    uint32be(image.length),
    image,
  );
}
