import { ExtensionStorage } from '@bacons/apple-targets';
import { Directory, File, Paths } from 'expo-file-system';
import { Platform } from 'react-native';

import type { Track } from '@/types/track';

/** Precisa bater com `app.json` e com `targets/widget/NowPlayingEntry.swift`. */
export const APP_GROUP = 'group.com.narcisojunior.connextmusic';

/** Chave lida pelo widget. */
const NOW_PLAYING_KEY = 'nowPlaying';

/** Nome fixo do arquivo de capa dentro do container compartilhado. */
const ARTWORK_FILE = 'widget-artwork.jpg';

export interface NowPlayingPayload {
  title: string;
  artist: string;
  artworkFile: string | null;
  isPlaying: boolean;
}

const storage = new ExtensionStorage(APP_GROUP);

/**
 * Diretório do App Group, ou `null` quando não existe.
 *
 * Some quando o app roda sem o entitlement — por exemplo num build antigo, de
 * antes da Issue #23. Devolver `null` deixa o widget sem capa, em vez de
 * derrubar a troca de faixa.
 */
function sharedDirectory(): Directory | null {
  try {
    return Paths.appleSharedContainers?.[APP_GROUP] ?? null;
  } catch {
    return null;
  }
}

/**
 * Copia a capa para o container compartilhado.
 *
 * A cópia é obrigatória, não um cache: o widget é outro processo e não consegue
 * ler o sandbox do app, então apontar para o caminho original renderia sempre
 * uma imagem vazia.
 *
 * Sempre o mesmo nome de arquivo — não acumula uma cópia por faixa. Devolve o
 * nome, ou `null` se não deu para copiar.
 */
function copyArtwork(artwork: string | null): string | null {
  if (!artwork) return null;

  const directory = sharedDirectory();
  if (!directory) return null;

  try {
    const source = new File(artwork);
    if (!source.exists) return null;

    const target = new File(directory, ARTWORK_FILE);
    if (target.exists) target.delete();
    source.copy(target);

    return ARTWORK_FILE;
  } catch (error) {
    console.warn('[widget] não foi possível copiar a capa:', error);
    return null;
  }
}

/**
 * Publica a faixa atual para o widget da tela de início.
 *
 * Chamado a cada troca de faixa e a cada play/pause. É deliberadamente barato
 * quando não há o que fazer: o widget não existe fora do iOS, e escrever a cada
 * atualização de progresso (1×/s) gastaria o orçamento de recarga que o iOS dá
 * ao widget sem mudar nada na tela.
 */
export function publishNowPlaying(track: Track | null, isPlaying: boolean): void {
  if (Platform.OS !== 'ios') return;

  try {
    if (!track) {
      storage.remove(NOW_PLAYING_KEY);
      ExtensionStorage.reloadWidget();
      return;
    }

    const artworkFile = copyArtwork(track.artwork);
    const payload: Record<string, string | number | boolean> = {
      title: track.title,
      artist: track.artist,
      isPlaying,
    };
    if (artworkFile) payload.artworkFile = artworkFile;

    storage.set(NOW_PLAYING_KEY, payload as unknown as Record<string, string | number>);
    // Sem isto o widget só se atualizaria no ritmo do próprio iOS, que é de
    // minutos — e o critério da issue é a troca de faixa aparecer.
    ExtensionStorage.reloadWidget();
  } catch (error) {
    // O widget é um espelho; falhar aqui não pode interromper a reprodução.
    console.warn('[widget] não foi possível publicar a faixa atual:', error);
  }
}
