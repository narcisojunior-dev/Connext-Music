/**
 * Gera o ID de uma faixa a partir do caminho e da data de modificacao.
 *
 * A combinacao dos dois e proposital: o caminho identifica o arquivo, e a data
 * faz o ID mudar quando o conteudo muda. E isso que permite o scan incremental
 * da Issue #7 detectar arquivos editados — se o ID fosse so o caminho, um
 * arquivo substituido manteria os metadados antigos para sempre.
 */
export function generateTrackId(filePath: string, modifiedDate: number): string {
  return hash64(`${filePath}:${modifiedDate}`);
}

/**
 * dJB2 alargado para 64 bits.
 *
 * O dJB2 classico devolve 32 bits, e com 32 bits a chance de duas faixas
 * colidirem numa biblioteca de 10 mil arquivos passa de 1% (paradoxo do
 * aniversario) — e uma colisao aqui faz uma musica sumir da biblioteca, porque
 * `removeDuplicates` descartaria a segunda como repetida. Rodamos entao as duas
 * variantes classicas em paralelo, a aditiva e a de XOR, e concatenamos: sao
 * regras de atualizacao diferentes, entao os dois valores nao andam juntos.
 */
function hash64(input: string): string {
  let add = 5381;
  let xor = 5381;

  for (let i = 0; i < input.length; i++) {
    const code = input.charCodeAt(i);
    // `<< 5` coage para int32, entao os dois acumuladores ficam em 32 bits.
    add = ((add << 5) + add + code) | 0;
    xor = (((xor << 5) + xor) ^ code) | 0;
  }

  return toHex32(add) + toHex32(xor);
}

/** Inteiro de 32 bits como 8 caracteres hex, sem sinal. */
function toHex32(value: number): string {
  return (value >>> 0).toString(16).padStart(8, '0');
}

/**
 * UUID v4 para entidades criadas pelo app (playlists, por exemplo).
 *
 * Prefere `crypto.randomUUID`, presente no Hermes do RN 0.86. O fallback cobre
 * ambientes onde ele nao esta exposto (alguns runners de teste, web antigo);
 * ele usa `Math.random`, que nao e criptografico — o que e aceitavel porque
 * estes IDs so precisam ser unicos dentro do aparelho, nao imprevisiveis.
 */
export function generateUUID(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
