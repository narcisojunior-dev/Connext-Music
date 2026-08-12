import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import {
  estimateMp3Duration,
  parseFlac,
  parseId3v1,
  parseId3v2,
  parseMp4,
  pictureExtension,
} from '@/services/file/tag-parsers';
import {
  apicFrame,
  box,
  concat,
  dataBox,
  flacBlock,
  flacPicture,
  FTYP,
  id3v1Tag,
  id3v2Tag,
  JPEG,
  latin1,
  mp3Audio,
  mvhd,
  PNG,
  streamInfo,
  synchsafe,
  textAtom,
  textFrame,
  trackNumberAtom,
  uint32be,
  vorbisComment,
} from './helpers/audio-fixtures';

const COPYRIGHT = String.fromCharCode(0xa9);

describe('ID3v2.3 (MP3)', () => {
  const file = concat(
    id3v2Tag([
      textFrame('TIT2', 'Luz de Agosto'),
      textFrame('TPE1', 'Marina Sol'),
      textFrame('TALB', 'Travessia'),
      textFrame('TCON', 'Jazz'),
      textFrame('TYER', '2021'),
      textFrame('TRCK', '5/12'),
      apicFrame(JPEG),
    ]),
    mp3Audio(),
  );

  test('lê todos os campos', () => {
    const tags = parseId3v2(file)!;
    assert.equal(tags.title, 'Luz de Agosto');
    assert.equal(tags.artist, 'Marina Sol');
    assert.equal(tags.album, 'Travessia');
    assert.equal(tags.genre, 'Jazz');
    assert.equal(tags.year, 2021);
    assert.equal(tags.trackNumber, 5, '"5/12" deve virar 5');
  });

  test('extrai a capa com os bytes intactos', () => {
    const picture = parseId3v2(file)!.picture!;
    assert.equal(picture.mimeType, 'image/jpeg');
    assert.equal(picture.data[0], 0xff, 'JPEG começa com FFD8');
    assert.equal(picture.data[1], 0xd8);
    assert.equal(picture.data.at(-1), 0xd9, 'JPEG termina com FFD9');
    assert.equal(pictureExtension(picture), '.jpg');
  });

  test('arquivo sem tag devolve null, para o chamador usar o fallback', () => {
    assert.equal(parseId3v2(mp3Audio()), null);
  });
});

describe('ID3v1 (MP3)', () => {
  const file = concat(
    mp3Audio(),
    id3v1Tag({
      title: 'Cancao Antiga',
      artist: 'Trio Velho',
      album: 'Coletanea',
      year: '1998',
      track: 7,
      genre: 17, // Rock
    }),
  );

  test('lê campos, faixa e gênero numérico', () => {
    const tags = parseId3v1(file)!;
    assert.equal(tags.title, 'Cancao Antiga');
    assert.equal(tags.artist, 'Trio Velho');
    assert.equal(tags.album, 'Coletanea');
    assert.equal(tags.year, 1998);
    assert.equal(tags.trackNumber, 7, 'ID3v1.1 guarda a faixa no fim do comentário');
    assert.equal(tags.genre, 'Rock', 'índice 17 = Rock');
  });

  test('ausência de ID3v1 devolve null', () => {
    assert.equal(parseId3v1(mp3Audio()), null);
  });
});

describe('encodings e versões do ID3', () => {
  test('UTF-16 com BOM preserva acentos', () => {
    const file = concat(
      id3v2Tag([textFrame('TIT2', 'Coração Partido', 1), textFrame('TPE1', 'João Café', 1)]),
      mp3Audio(),
    );
    const tags = parseId3v2(file)!;
    assert.equal(tags.title, 'Coração Partido');
    assert.equal(tags.artist, 'João Café');
  });

  test('gênero numérico "(32)" resolve para o nome', () => {
    const file = concat(id3v2Tag([textFrame('TCON', '(32)')]), mp3Audio());
    assert.equal(parseId3v2(file)!.genre, 'Classical');
  });

  test('v2.4 usa tamanhos synchsafe, TDRC no lugar de TYER e UTF-8', () => {
    const file = concat(
      id3v2Tag(
        [
          textFrame('TIT2', 'Noite Serena', 3, 4),
          textFrame('TPE1', 'Duo Íris', 3, 4),
          textFrame('TDRC', '2019-03-14', 3, 4),
          apicFrame(PNG, 'image/png', 4),
        ],
        4,
      ),
      mp3Audio(),
    );
    const tags = parseId3v2(file)!;
    assert.equal(tags.title, 'Noite Serena');
    assert.equal(tags.artist, 'Duo Íris');
    assert.equal(tags.year, 2019, 'TDRC "2019-03-14" deve dar 2019');
    assert.equal(tags.picture!.mimeType, 'image/png');
    assert.equal(pictureExtension(tags.picture!), '.png');
  });
});

describe('MP4 / M4A', () => {
  const ilst = concat(
    textAtom(`${COPYRIGHT}nam`, 'Cais do Norte'),
    textAtom(`${COPYRIGHT}ART`, 'Banda Maré'),
    textAtom(`${COPYRIGHT}alb`, 'Porto'),
    textAtom(`${COPYRIGHT}gen`, 'Bossa Nova'),
    textAtom(`${COPYRIGHT}day`, '2020'),
    trackNumberAtom(3, 10),
    box('covr', dataBox(JPEG, 13)),
  );
  const meta = box(
    'meta',
    concat(new Uint8Array(4), box('hdlr', new Uint8Array(24)), box('ilst', ilst)),
  );
  const tagged = concat(
    FTYP,
    box('moov', concat(mvhd(1000, 185000), box('udta', meta))),
    box('mdat', new Uint8Array(4096)),
  );

  test('lê os átomos iTunes', () => {
    const tags = parseMp4(tagged)!;
    assert.equal(tags.title, 'Cais do Norte');
    assert.equal(tags.artist, 'Banda Maré');
    assert.equal(tags.album, 'Porto');
    assert.equal(tags.genre, 'Bossa Nova');
    assert.equal(tags.year, 2020);
    assert.equal(tags.trackNumber, 3);
  });

  test('duração sai exata do mvhd', () => {
    assert.equal(parseMp4(tagged)!.duration, 185, '185000/1000 = 185s');
  });

  test('capa extraída', () => {
    assert.equal(parseMp4(tagged)!.picture!.mimeType, 'image/jpeg');
  });

  test('sem ilst devolve tags vazias mas mantém a duração', () => {
    const semTags = concat(
      FTYP,
      box('moov', mvhd(1000, 185000)),
      box('mdat', new Uint8Array(4096)),
    );
    const tags = parseMp4(semTags)!;
    assert.equal(tags.title, null);
    assert.equal(tags.duration, 185);
  });

  test('devolve null para algo que não é MP4', () => {
    assert.equal(parseMp4(concat(id3v2Tag([textFrame('TIT2', 'x')]), mp3Audio())), null);
  });
});

describe('FLAC', () => {
  const file = concat(
    latin1('fLaC'),
    flacBlock(0, streamInfo(44100, 8_820_000)),
    flacBlock(
      4,
      vorbisComment([
        ['TITLE', 'Rio Acima'],
        ['ARTIST', 'Coral Sul'],
        ['ALBUM', 'Nascente'],
        ['GENRE', 'Folk'],
        ['DATE', '2022'],
        ['TRACKNUMBER', '2'],
      ]),
    ),
    flacBlock(6, flacPicture(JPEG), true),
    new Uint8Array(4096),
  );

  test('lê o VORBIS_COMMENT completo', () => {
    const tags = parseFlac(file)!;
    assert.equal(tags.title, 'Rio Acima');
    assert.equal(tags.artist, 'Coral Sul');
    assert.equal(tags.album, 'Nascente');
    assert.equal(tags.genre, 'Folk');
    assert.equal(tags.year, 2022);
    assert.equal(tags.trackNumber, 2);
  });

  test('duração sai exata do STREAMINFO', () => {
    assert.equal(parseFlac(file)!.duration, 200, '8.820.000 / 44100 = 200s');
  });

  test('bloco PICTURE extraído', () => {
    assert.equal(parseFlac(file)!.picture!.data[0], 0xff);
  });

  test('devolve null sem o magic fLaC', () => {
    assert.equal(parseFlac(mp3Audio()), null);
  });
});

describe('robustez dos parsers', () => {
  test('bytes aleatórios não lançam nem inventam tags', () => {
    const junk = Uint8Array.from({ length: 4096 }, () => Math.floor(Math.random() * 256));
    assert.equal(parseId3v2(junk), null);
    assert.equal(parseMp4(junk), null);
    assert.equal(parseFlac(junk), null);
  });

  test('tag que mente sobre o próprio tamanho não lê além do fim', () => {
    // Declara 500 KB de tag num arquivo de 24 bytes.
    const mentiroso = concat(
      latin1('ID3'),
      Uint8Array.from([3, 0, 0]),
      synchsafe(500_000),
      latin1('TIT2'),
      uint32be(5),
      Uint8Array.from([0, 0, 0]),
      latin1('abc'),
    );
    const tags = parseId3v2(mentiroso);
    assert.ok(tags, 'deve devolver tags, mesmo que vazias');
    assert.equal(tags.title, null);
  });

  test('todos aguentam entrada vazia', () => {
    const empty = new Uint8Array(0);
    assert.equal(parseId3v2(empty), null);
    assert.equal(parseId3v1(empty), null);
    assert.equal(parseMp4(empty), null);
    assert.equal(parseFlac(empty), null);
  });
});

describe('duração estimada de MP3', () => {
  test('128 kbps: a estimativa acompanha o tamanho do arquivo', () => {
    // É estimativa por assumir bitrate constante — arquivos VBR saem errados.
    const audio = mp3Audio();
    const seconds = estimateMp3Duration(audio, audio.length);
    assert.ok(seconds !== null && seconds >= 2 && seconds <= 4, `esperado ~3s, veio ${seconds}`);
  });
});
