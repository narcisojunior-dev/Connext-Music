import type { Track } from '@/types/track';

/** Quantas linhas os rankings da tela de Estatísticas mostram. */
export const TOP_LIMIT = 50;

const DAY_MS = 24 * 60 * 60 * 1000;

export interface ArtistStat {
  artist: string;
  plays: number;
  trackCount: number;
  /** Soma de `duration × playCount` das faixas do artista, em segundos. */
  seconds: number;
}

export interface DayStat {
  /** Meia-noite local do dia, em ms. */
  date: number;
  /** Rótulo curto: `seg`, `ter`, ... */
  label: string;
  /** Faixas cuja última reprodução caiu neste dia. */
  plays: number;
}

export interface LibraryStats {
  totalTracks: number;
  playedTracks: number;
  totalPlays: number;
  /**
   * Tempo total ouvido, em segundos — **estimado**.
   *
   * É `duration × playCount`, ou seja, assume que cada reprodução contada foi
   * até o fim. Como a contagem exige 50% da faixa, o número real fica entre
   * metade disto e isto. Medir de verdade exigiria somar segundos ouvidos a
   * cada evento de progresso e guardar esse total; não vale o custo de escrita
   * para um número que a tela apresenta como aproximado.
   */
  estimatedSeconds: number;
  topTracks: Track[];
  topArtists: ArtistStat[];
  /** Últimos 7 dias, do mais antigo para o mais recente. */
  lastWeek: DayStat[];
}

const WEEKDAYS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];

/** Meia-noite local do dia a que o timestamp pertence. */
function startOfDay(timestamp: number): number {
  const d = new Date(timestamp);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/**
 * Agrega a biblioteca inteira num resumo.
 *
 * `now` é injetável para os testes poderem fixar a semana; em produção nada
 * passa esse argumento.
 */
export function computeStats(tracks: Track[], now: number = Date.now()): LibraryStats {
  const byArtist = new Map<string, ArtistStat>();

  let totalPlays = 0;
  let estimatedSeconds = 0;
  let playedTracks = 0;

  for (const track of tracks) {
    totalPlays += track.playCount;
    estimatedSeconds += track.duration * track.playCount;
    if (track.playCount > 0) playedTracks++;

    const key = track.artist || 'Artista desconhecido';
    const entry = byArtist.get(key) ?? { artist: key, plays: 0, trackCount: 0, seconds: 0 };
    entry.plays += track.playCount;
    entry.trackCount++;
    entry.seconds += track.duration * track.playCount;
    byArtist.set(key, entry);
  }

  // Só entram artistas que foram de fato ouvidos: senão o ranking listaria a
  // biblioteca toda empatada em zero.
  const topArtists = [...byArtist.values()]
    .filter((a) => a.plays > 0)
    .sort((a, b) => b.plays - a.plays || a.artist.localeCompare(b.artist))
    .slice(0, TOP_LIMIT);

  const topTracks = tracks
    .filter((t) => t.playCount > 0)
    .sort((a, b) => b.playCount - a.playCount)
    .slice(0, TOP_LIMIT);

  // A janela vai de 6 dias atrás até hoje, sempre com 7 posições — um dia sem
  // nenhuma reprodução precisa aparecer como zero, não sumir do gráfico.
  const today = startOfDay(now);
  const lastWeek: DayStat[] = [];
  for (let i = 6; i >= 0; i--) {
    const date = today - i * DAY_MS;
    lastWeek.push({ date, label: WEEKDAYS[new Date(date).getDay()], plays: 0 });
  }

  for (const track of tracks) {
    if (track.lastPlayedAt === null) continue;
    const day = startOfDay(track.lastPlayedAt);
    const slot = lastWeek.find((d) => d.date === day);
    if (slot) slot.plays++;
  }

  return {
    totalTracks: tracks.length,
    playedTracks,
    totalPlays,
    estimatedSeconds,
    topTracks,
    topArtists,
    lastWeek,
  };
}

/**
 * Duração longa em texto curto: `4h 32min`, `12min`.
 *
 * Separado de `formatDuration`, que serve para a posição dentro de uma faixa e
 * escreve `mm:ss` — `274:19:07` não é um tempo total legível.
 */
export function formatListeningTime(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`;

  const totalMinutes = Math.floor(seconds / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours === 0) return `${minutes}min`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}min`;
}
