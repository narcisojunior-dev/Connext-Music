import type { Track } from '@/types/track';

/**
 * Faixas de exemplo para exercitar os stores antes do scanner existir.
 *
 * **Fixture de desenvolvimento.** Os caminhos em `url` nao apontam para
 * arquivos reais — servem para preencher a UI e validar o fluxo de estado. Sai
 * do projeto quando a Issue #5 passar a popular a biblioteca de verdade.
 */
const BASE: Omit<Track, 'id' | 'url' | 'fileName'>[] = [
  {
    title: 'Aurora',
    artist: 'Lumen',
    album: 'Primeira Luz',
    genre: 'Ambient',
    year: 2023,
    trackNumber: 1,
    duration: 214,
    artwork: null,
    fileSize: 5_242_880,
    extension: '.mp3',
    modifiedDate: 1_700_000_000_000,
    playCount: 12,
    lastPlayedAt: 1_750_000_000_000,
    isFavorite: true,
  },
  {
    title: 'Correnteza',
    artist: 'Lumen',
    album: 'Primeira Luz',
    genre: 'Ambient',
    year: 2023,
    trackNumber: 2,
    duration: 187,
    artwork: null,
    fileSize: 4_718_592,
    extension: '.mp3',
    modifiedDate: 1_700_000_100_000,
    playCount: 3,
    lastPlayedAt: null,
    isFavorite: false,
  },
  {
    title: 'Noturno em Ré',
    artist: 'Ana Vilar',
    album: 'Peças para Piano',
    genre: 'Clássica',
    year: 2019,
    trackNumber: 4,
    duration: 342,
    artwork: null,
    fileSize: 9_437_184,
    extension: '.flac',
    modifiedDate: 1_690_000_000_000,
    playCount: 0,
    lastPlayedAt: null,
    isFavorite: false,
  },
  {
    title: 'Cidade Vazia',
    artist: 'Trio Norte',
    album: 'Ao Vivo',
    genre: 'Jazz',
    year: 2021,
    trackNumber: 7,
    duration: 268,
    artwork: null,
    fileSize: 6_815_744,
    extension: '.m4a',
    modifiedDate: 1_695_000_000_000,
    playCount: 27,
    lastPlayedAt: 1_755_000_000_000,
    isFavorite: true,
  },
];

/**
 * Monta as faixas de exemplo com `id`, `url` e `fileName` derivados, imitando o
 * que o scanner produzira.
 */
export function createMockTracks(): Track[] {
  return BASE.map((track, index) => {
    const fileName = `${String(index + 1).padStart(2, '0')} ${track.title}${track.extension}`;
    return {
      ...track,
      id: `mock-${index + 1}`,
      url: `file:///mock/Documents/Music/${fileName}`,
      fileName,
    };
  });
}
