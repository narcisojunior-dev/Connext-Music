import * as DocumentPicker from 'expo-document-picker';
import { Directory, File, Paths } from 'expo-file-system';

import { SUPPORTED_EXTENSIONS } from '@/types/track';

/**
 * Subpasta de destino dentro de `Documents/`.
 *
 * O scanner varre `Documents/` inteiro e desce nas subpastas, então o
 * importado é encontrado sem nenhuma configuração extra. A subpasta existe para
 * separar o que veio do picker do que o usuário largou na raiz pelo app
 * Arquivos — o que facilita entender o que é o quê pelo Finder.
 */
const IMPORT_DIRECTORY = 'Music';

/**
 * Deixa o nome de pasta seguro para o sistema de arquivos.
 *
 * Barra e dois-pontos criariam niveis que o usuario nao pediu, ou quebrariam o
 * caminho. Devolve `null` quando nao sobra nada utilizavel — o chamador entao
 * importa para a pasta padrao em vez de criar uma pasta sem nome.
 */
export function sanitizeFolderName(name: string): string | null {
  const safe = name
    .replace(/[/\\:*?"<>|]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // `.` e `..` tem significado no sistema de arquivos.
  if (!safe || safe === '.' || safe === '..') return null;
  return safe.slice(0, 60);
}

/**
 * Tipos aceitos pelo seletor — **MIME types, não UTIs**.
 *
 * O `expo-document-picker` converte cada entrada com `UTType(mimeType:)` e
 * descarta com `compactMap` o que não converter. Passando UTIs (`public.audio`,
 * `public.mp3`…) todas viram `nil`, a lista chega vazia ao
 * `UIDocumentPickerViewController` e **nenhum arquivo fica selecionável** — foi
 * exatamente o que aconteceu aqui: as músicas apareciam acinzentadas.
 *
 * `audio/*` é tratado à parte pelo módulo e vira `UTType.audio`, o guarda-chuva
 * a que todo áudio reconhecido pelo iOS conforma. Os específicos vêm junto
 * porque nem todo arquivo chega com o tipo declarado; os que o iOS não conhecer
 * são descartados sem prejuízo, já que `audio/*` sustenta a lista sozinho.
 */
const ACCEPTED_TYPES = [
  'audio/*',
  'audio/mpeg',
  'audio/mp4',
  'audio/x-m4a',
  'audio/aac',
  'audio/flac',
  'audio/x-flac',
  'audio/wav',
  'audio/x-wav',
  'audio/ogg',
];

export interface ImportProgress {
  /** Arquivo sendo copiado, começando em 1. */
  current: number;
  total: number;
  fileName: string;
}

export interface ImportResult {
  /** Arquivos copiados com sucesso. */
  imported: number;
  /** Selecionados mas rejeitados por extensão não suportada. */
  rejected: string[];
  /** Selecionados que já existiam no destino. */
  skipped: string[];
  /** Falharam na cópia. */
  failed: string[];
  /** Usuário fechou o seletor sem escolher nada. */
  canceled: boolean;
}

const EMPTY: ImportResult = {
  imported: 0,
  rejected: [],
  skipped: [],
  failed: [],
  canceled: false,
};

/** Extensão em minúsculas, com ponto. `""` quando o nome não tem extensão. */
function extensionOf(fileName: string): string {
  const dot = fileName.lastIndexOf('.');
  return dot < 0 ? '' : fileName.slice(dot).toLowerCase();
}

/**
 * O arquivo é de um formato que o app sabe tocar?
 *
 * A checagem é pela extensão, e não pelo MIME que o picker informa: o iOS
 * entrega `application/octet-stream` para bastante coisa vinda de nuvem, e
 * confiar nisso rejeitaria arquivos perfeitamente válidos. A extensão é o que
 * o scanner também usa, então importar por ela garante que o que entra é o que
 * vai ser encontrado depois.
 */
export function isSupportedAudio(fileName: string): boolean {
  return (SUPPORTED_EXTENSIONS as readonly string[]).includes(extensionOf(fileName));
}

/**
 * Nome livre dentro da pasta de destino.
 *
 * Dois arquivos diferentes podem ter o mesmo nome, vindos de pastas
 * diferentes. Sobrescrever perderia música do usuário sem aviso, então o
 * segundo vira `nome (2).mp3`.
 */
export function uniqueName(taken: Set<string>, fileName: string): string {
  if (!taken.has(fileName)) return fileName;

  const dot = fileName.lastIndexOf('.');
  const base = dot < 0 ? fileName : fileName.slice(0, dot);
  const ext = dot < 0 ? '' : fileName.slice(dot);

  for (let n = 2; ; n++) {
    const candidate = `${base} (${n})${ext}`;
    if (!taken.has(candidate)) return candidate;
  }
}

/**
 * Cria (se preciso) e devolve a pasta de destino.
 *
 * Com `subfolder`, o destino vira `Documents/Music/<subfolder>/`, e a aba
 * Pastas (Issue #28) passa a mostrar esse grupo separado. Sem ele tudo cai em
 * `Music/`, achatando a organizacao que o usuario tinha na origem — o seletor
 * do iOS nao informa de que pasta cada arquivo veio, entao reconstrui-la e
 * impossivel; nomear o lote e o mais perto disso que da para chegar.
 */
function importDirectory(subfolder?: string | null): Directory {
  const directory = subfolder
    ? new Directory(Paths.document, IMPORT_DIRECTORY, subfolder)
    : new Directory(Paths.document, IMPORT_DIRECTORY);

  if (!directory.exists) directory.create({ intermediates: true });
  return directory;
}

/**
 * Abre o seletor do iOS e copia o que for escolhido para a pasta do app.
 *
 * Copiar é obrigatório, não uma escolha: o que o picker devolve é um arquivo
 * temporário fora do sandbox do app, e o iOS o descarta a qualquer momento. Uma
 * biblioteca apontando para ele quebraria sozinha depois de um tempo.
 *
 * Não dispara o scan — quem chama decide quando reescanear, porque a tela quer
 * mostrar o resultado da importação antes de começar a varredura.
 */
export async function importMusicFiles(
  onProgress?: (progress: ImportProgress) => void,
  subfolder?: string | null,
): Promise<ImportResult> {
  let picked: DocumentPicker.DocumentPickerResult;
  try {
    picked = await DocumentPicker.getDocumentAsync({
      type: ACCEPTED_TYPES,
      multiple: true,
      // Sem a cópia para o cache o URI pode ser um "security-scoped" que perde
      // a permissão assim que o seletor fecha, e a leitura falha.
      copyToCacheDirectory: true,
    });
  } catch (error) {
    console.warn('[import] o seletor de arquivos falhou:', error);
    return { ...EMPTY, failed: ['Não foi possível abrir o seletor'] };
  }

  if (picked.canceled || !picked.assets?.length) {
    return { ...EMPTY, canceled: true };
  }

  const directory = importDirectory(subfolder ? sanitizeFolderName(subfolder) : null);
  const taken = new Set<string>();
  try {
    for (const entry of directory.list()) {
      if (entry instanceof File) taken.add(entry.name);
    }
  } catch (error) {
    console.warn('[import] não foi possível listar o destino:', error);
  }

  const result: ImportResult = { ...EMPTY, rejected: [], skipped: [], failed: [] };
  const total = picked.assets.length;

  for (let i = 0; i < total; i++) {
    const asset = picked.assets[i];
    onProgress?.({ current: i + 1, total, fileName: asset.name });

    if (!isSupportedAudio(asset.name)) {
      result.rejected.push(asset.name);
      continue;
    }

    // Mesmo nome *e* mesmo tamanho e o mais perto de "e o mesmo arquivo" que
    // da para afirmar sem ler os dois inteiros. So o nome nao basta: dois
    // arquivos diferentes podem se chamar `01 - Faixa.mp3`, e descartar o
    // segundo perderia musica em silencio.
    if (sameSize(directory, asset.name, asset.size)) {
      result.skipped.push(asset.name);
      continue;
    }

    const target = uniqueName(taken, asset.name);

    try {
      new File(asset.uri).copy(new File(directory, target));
      taken.add(target);
      result.imported++;
    } catch (error) {
      console.warn(`[import] falha ao copiar ${asset.name}:`, error);
      result.failed.push(asset.name);
    }
  }

  return result;
}

/** Um arquivo de mesmo nome e mesmo tamanho já está no destino? */
function sameSize(directory: Directory, fileName: string, size: number | undefined): boolean {
  if (size === undefined) return false;
  try {
    const existing = new File(directory, fileName);
    return existing.exists && existing.size === size;
  } catch {
    return false;
  }
}

/** Frase única resumindo o resultado, para o alerta pós-importação. */
export function describeImport(result: ImportResult): string {
  const parts: string[] = [];

  if (result.imported > 0) {
    parts.push(
      `${result.imported} ${result.imported === 1 ? 'música importada' : 'músicas importadas'}`,
    );
  }
  if (result.skipped.length > 0) {
    parts.push(
      `${result.skipped.length} já estava${result.skipped.length === 1 ? '' : 'm'} na biblioteca`,
    );
  }
  if (result.rejected.length > 0) {
    parts.push(`${result.rejected.length} em formato não suportado`);
  }
  if (result.failed.length > 0) {
    parts.push(`${result.failed.length} ${result.failed.length === 1 ? 'falhou' : 'falharam'}`);
  }

  if (parts.length === 0) return 'Nenhum arquivo importado.';
  return `${parts.join(', ')}.`;
}
