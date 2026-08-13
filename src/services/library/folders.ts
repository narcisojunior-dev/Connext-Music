import { normalizeSearch } from '@/utils/search';
import type { Track } from '@/types/track';

export interface FolderNode {
  /** Caminho completo, relativo a `Documents/`. `""` é a raiz. */
  path: string;
  /** Só o último segmento — o que aparece na lista. */
  name: string;
  /** Subpastas, já ordenadas. */
  children: FolderNode[];
  /** Faixas soltas **neste** nível, sem contar as das subpastas. */
  tracks: Track[];
  /** Total de faixas aqui e em tudo abaixo. É o número que a lista mostra. */
  totalTracks: number;
}

/** Nome exibido para as faixas que estão na raiz de `Documents/`. */
export const ROOT_FOLDER_LABEL = 'Sem pasta';

function compareNames(a: string, b: string): number {
  return normalizeSearch(a).localeCompare(normalizeSearch(b), 'pt-BR');
}

/**
 * Monta a árvore de pastas da biblioteca.
 *
 * A árvore é derivada das faixas em memória, não persistida: ela é uma leitura
 * do `folderPath` de cada uma, e recalcular custa menos que manter em dia.
 *
 * Pastas de passagem são **colapsadas**: se `MPB/1970/` é a única coisa dentro
 * de `MPB/` e não há faixas soltas em `MPB/`, os dois viram um nó só,
 * `MPB/1970`. Sem isso, navegar até a música exigiria um toque por nível de uma
 * hierarquia que o usuário não criou para ser percorrida — ele criou para
 * organizar.
 */
export function buildFolderTree(tracks: Track[]): FolderNode {
  const root: FolderNode = {
    path: '',
    name: ROOT_FOLDER_LABEL,
    children: [],
    tracks: [],
    totalTracks: 0,
  };

  for (const track of tracks) {
    const path = track.folderPath ?? '';

    if (!path) {
      root.tracks.push(track);
      continue;
    }

    let node = root;
    let walked = '';

    for (const segment of path.split('/')) {
      if (!segment) continue;
      walked = walked ? `${walked}/${segment}` : segment;

      let child = node.children.find((c) => c.path === walked);
      if (!child) {
        child = { path: walked, name: segment, children: [], tracks: [], totalTracks: 0 };
        node.children.push(child);
      }
      node = child;
    }

    node.tracks.push(track);
  }

  finalize(root);
  return root;
}

/** Calcula os totais, ordena e colapsa as pastas de passagem. */
function finalize(node: FolderNode): number {
  node.children = node.children.map(collapse);
  node.children.sort((a, b) => compareNames(a.name, b.name));
  node.tracks.sort((a, b) => compareNames(a.title, b.title));

  let total = node.tracks.length;
  for (const child of node.children) {
    total += finalize(child);
  }

  node.totalTracks = total;
  return total;
}

/**
 * Funde um nó com o único filho, quando ele não tem faixas próprias.
 *
 * A recursão desce antes de decidir: `a/b/c` só vira um nó depois de `b/c` ter
 * virado.
 */
function collapse(node: FolderNode): FolderNode {
  node.children = node.children.map(collapse);

  if (node.tracks.length === 0 && node.children.length === 1) {
    const only = node.children[0];
    return {
      ...only,
      // O nome mostra o caminho fundido, para a pessoa reconhecer a pasta que
      // ela mesma criou em vez de só o último segmento.
      name: `${node.name}/${only.name}`,
    };
  }

  return node;
}

/**
 * Encontra um nó pelo caminho. `""` devolve a raiz.
 *
 * Percorre a árvore já colapsada em vez de dividir o caminho por `/`, porque um
 * nó fundido tem `path` de vários segmentos e não corresponde a nenhum nível
 * intermediário.
 */
export function findFolder(root: FolderNode, path: string): FolderNode | null {
  if (path === root.path) return root;

  for (const child of root.children) {
    const found = findFolder(child, path);
    if (found) return found;
  }

  return null;
}

/**
 * Caminho do nó atual até a raiz, para o breadcrumb.
 *
 * Devolve da raiz para dentro, incluindo o próprio nó.
 */
export function folderTrail(root: FolderNode, path: string): FolderNode[] {
  if (path === root.path) return [root];

  for (const child of root.children) {
    const trail = folderTrail(child, path);
    if (trail.length > 0) return [root, ...trail];
  }

  return [];
}

/**
 * Todas as faixas de um nó e de tudo abaixo dele, na ordem exibida.
 *
 * É a fila que toca ao escolher uma faixa dentro de uma pasta: quem abre
 * `Rock/` e toca a primeira espera ouvir o que está em `Rock/`, incluindo as
 * subpastas, e não parar na primeira faixa.
 */
export function collectFolderTracks(node: FolderNode): Track[] {
  const out = [...node.tracks];
  for (const child of node.children) {
    out.push(...collectFolderTracks(child));
  }
  return out;
}
