import { ExtensionStorage } from '@bacons/apple-targets';

import { APP_GROUP } from '@/services/app-group';

const PENDING_COMMAND_KEY = 'pendingCommand';
const PLAYLISTS_KEY = 'playlists';

/**
 * Idade máxima de um comando, em milissegundos.
 *
 * Um atalho disparado e cancelado deixa o comando gravado. Sem este limite, ele
 * tocaria música na próxima vez que o app fosse aberto — possivelmente dias
 * depois, sem ninguém ter pedido.
 */
const MAX_AGE_MS = 30_000;

export type SiriCommand =
  { command: 'playRandom' } | { command: 'pause' } | { command: 'playPlaylist'; argument: string };

const storage = new ExtensionStorage(APP_GROUP);

/**
 * Lê e consome o comando deixado por um atalho do Siri.
 *
 * Consome sempre, mesmo quando o comando é velho demais: deixá-lo gravado só
 * adiaria o problema para a abertura seguinte.
 */
export function takePendingCommand(now: number = Date.now()): SiriCommand | null {
  let raw: string | null = null;
  try {
    raw = storage.get(PENDING_COMMAND_KEY);
  } catch {
    return null;
  }

  if (!raw) return null;

  try {
    storage.remove(PENDING_COMMAND_KEY);
  } catch {
    // Não conseguir limpar não impede executar; o guarda de idade evita a
    // repetição na próxima abertura.
  }

  return parsePendingCommand(raw, now);
}

/**
 * Valida o que veio do Swift.
 *
 * Separado de `takePendingCommand` para poder ser testado sem o módulo nativo,
 * que não existe fora do aparelho.
 */
export function parsePendingCommand(raw: string, now: number = Date.now()): SiriCommand | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }

  if (typeof parsed !== 'object' || parsed === null) return null;

  const data = parsed as { command?: unknown; argument?: unknown; requestedAt?: unknown };

  if (typeof data.requestedAt !== 'number' || now - data.requestedAt > MAX_AGE_MS) {
    return null;
  }

  switch (data.command) {
    case 'playRandom':
      return { command: 'playRandom' };
    case 'pause':
      return { command: 'pause' };
    case 'playPlaylist':
      return typeof data.argument === 'string' && data.argument
        ? { command: 'playPlaylist', argument: data.argument }
        : null;
    default:
      return null;
  }
}

/**
 * Publica as playlists para o Siri poder oferecê-las por nome.
 *
 * Precisa acontecer **antes** de o atalho ser usado: o Siri completa "toca
 * playlist Corrida" consultando esta lista, e o app pode nem estar aberto nesse
 * momento. Por isso a lista é escrita a cada mudança, e não sob demanda.
 */
export function publishPlaylists(playlists: { id: string; name: string }[]): void {
  try {
    storage.set(
      PLAYLISTS_KEY,
      playlists.map((p) => ({ id: p.id, name: p.name })),
    );
  } catch (error) {
    console.warn('[siri] não foi possível publicar as playlists:', error);
  }
}
