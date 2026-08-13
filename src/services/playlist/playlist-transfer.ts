import { normalizeSearch } from '@/utils/search';
import type { Playlist } from '@/types/playlist';
import type { Track } from '@/types/track';

/**
 * Versão do formato de arquivo.
 *
 * Separada da `SCHEMA_VERSION` do AsyncStorage de propósito: aquela governa o
 * que este aparelho guardou e pode ser descartada à vontade, esta viaja para
 * outra pessoa e precisa continuar legível por versões futuras do app.
 */
export const PLAYLIST_FILE_VERSION = 1;

/** Extensão dos arquivos exportados. */
export const PLAYLIST_FILE_EXTENSION = '.connextplaylist.json';

/**
 * Uma faixa dentro do arquivo exportado.
 *
 * Guarda o que **identifica** a música, não o que a localiza: o `id` de `Track`
 * é um hash do caminho e da data de modificação do arquivo, então não significa
 * nada em outro aparelho. Título e artista são o que permite reencontrar a
 * faixa numa biblioteca diferente; álbum e duração servem para desempatar e
 * para mostrar o que faltou.
 */
export interface ExportedTrack {
  title: string;
  artist: string;
  album: string;
  /** Em segundos. */
  duration: number;
}

export interface ExportedPlaylist {
  version: number;
  /** Marca d'água para reconhecer o arquivo, mesmo renomeado. */
  app: 'connext-music';
  name: string;
  description?: string;
  exportedAt: number;
  tracks: ExportedTrack[];
}

/** Monta o objeto exportável de uma playlist. */
export function serializePlaylist(playlist: Playlist, library: Track[]): ExportedPlaylist {
  const byId = new Map(library.map((t) => [t.id, t]));

  // IDs órfãos (arquivo removido do disco) simplesmente não entram: exportar
  // uma entrada vazia só produziria um "não encontrado" do outro lado.
  const tracks = playlist.trackIds
    .map((id) => byId.get(id))
    .filter((t): t is Track => !!t)
    .map((t): ExportedTrack => ({
      title: t.title,
      artist: t.artist,
      album: t.album,
      duration: Math.round(t.duration),
    }));

  return {
    version: PLAYLIST_FILE_VERSION,
    app: 'connext-music',
    name: playlist.name,
    description: playlist.description,
    exportedAt: Date.now(),
    tracks,
  };
}

/** Nome de arquivo seguro derivado do nome da playlist. */
export function playlistFileName(name: string): string {
  const safe = name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    // Barras e dois-pontos quebram caminhos; o resto vira hífen para o nome
    // continuar legível no app Arquivos.
    .replace(/[^a-zA-Z0-9 _-]/g, '')
    .trim()
    .replace(/\s+/g, '-');

  return `${safe || 'playlist'}${PLAYLIST_FILE_EXTENSION}`;
}

export type ParseResult = { ok: true; playlist: ExportedPlaylist } | { ok: false; reason: string };

/**
 * Lê e valida um arquivo de playlist.
 *
 * Devolve o motivo em vez de lançar: a mensagem vai direto para o usuário, e
 * "arquivo de outro app" precisa ser distinguível de "arquivo corrompido" — são
 * ações diferentes para quem está tentando importar.
 */
export function parsePlaylistFile(json: string): ParseResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return { ok: false, reason: 'Este arquivo não é um JSON válido.' };
  }

  if (typeof parsed !== 'object' || parsed === null) {
    return { ok: false, reason: 'Este arquivo não é uma playlist do Connext Music.' };
  }

  const data = parsed as Partial<ExportedPlaylist>;

  if (data.app !== 'connext-music') {
    return { ok: false, reason: 'Este arquivo não é uma playlist do Connext Music.' };
  }

  if (typeof data.version !== 'number' || data.version > PLAYLIST_FILE_VERSION) {
    return {
      ok: false,
      reason: 'Esta playlist foi exportada por uma versão mais nova do app. Atualize para abrir.',
    };
  }

  if (typeof data.name !== 'string' || !data.name.trim()) {
    return { ok: false, reason: 'A playlist não tem nome.' };
  }

  if (!Array.isArray(data.tracks)) {
    return { ok: false, reason: 'A playlist não tem lista de faixas.' };
  }

  // Entradas malformadas são descartadas individualmente: uma linha corrompida
  // não deve invalidar as outras quarenta.
  const tracks = data.tracks.filter(
    (t): t is ExportedTrack =>
      typeof t === 'object' &&
      t !== null &&
      typeof (t as ExportedTrack).title === 'string' &&
      typeof (t as ExportedTrack).artist === 'string',
  );

  return {
    ok: true,
    playlist: {
      version: data.version,
      app: 'connext-music',
      name: data.name.trim(),
      description: typeof data.description === 'string' ? data.description : undefined,
      exportedAt: typeof data.exportedAt === 'number' ? data.exportedAt : Date.now(),
      tracks,
    },
  };
}

/** Chave de comparação de uma faixa: título e artista, sem acento nem caixa. */
function matchKey(title: string, artist: string): string {
  return `${normalizeSearch(title)} ${normalizeSearch(artist)}`;
}

export interface MatchResult {
  /** IDs da biblioteca local, na ordem do arquivo. */
  trackIds: string[];
  /** Faixas do arquivo que não existem nesta biblioteca. */
  missing: ExportedTrack[];
}

/**
 * Casa as faixas do arquivo com a biblioteca local.
 *
 * A comparação é por título + artista, ignorando acento e caixa — o mesmo
 * tratamento da busca. Não usa duração porque o mesmo álbum ripado de fontes
 * diferentes varia alguns segundos, e isso descartaria pares corretos.
 *
 * O que não for encontrado volta em `missing`, para a tela poder dizer *quais*
 * músicas faltam: uma playlist importada pela metade sem explicação parece
 * defeito do app, e não ausência de arquivos.
 */
export function matchTracks(exported: ExportedTrack[], library: Track[]): MatchResult {
  const byKey = new Map<string, string>();
  // A primeira ocorrência vence: com duplicatas na biblioteca, qualquer uma
  // serve, e trocar de escolha a cada importação seria pior.
  for (const track of library) {
    const key = matchKey(track.title, track.artist);
    if (!byKey.has(key)) byKey.set(key, track.id);
  }

  const trackIds: string[] = [];
  const missing: ExportedTrack[] = [];

  for (const entry of exported) {
    const id = byKey.get(matchKey(entry.title, entry.artist));
    if (id) trackIds.push(id);
    else missing.push(entry);
  }

  return { trackIds, missing };
}

/** Frase de resultado da importação, para o alerta. */
export function describeImport(name: string, result: MatchResult): string {
  const found = result.trackIds.length;
  const lost = result.missing.length;

  if (found === 0) {
    return `Nenhuma das ${lost} faixas de “${name}” está na sua biblioteca. A playlist foi criada vazia.`;
  }
  if (lost === 0) {
    return `“${name}” importada com ${found} ${found === 1 ? 'faixa' : 'faixas'}.`;
  }

  const exemplos = result.missing
    .slice(0, 3)
    .map((t) => `${t.title} — ${t.artist}`)
    .join('\n');
  const resto = lost > 3 ? `\ne mais ${lost - 3}` : '';

  return `“${name}” importada com ${found} de ${found + lost} faixas.\n\nNão estão na sua biblioteca:\n${exemplos}${resto}`;
}
