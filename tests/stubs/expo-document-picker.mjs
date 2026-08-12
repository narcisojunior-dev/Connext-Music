/**
 * Stub do seletor de arquivos.
 *
 * Os testes cobrem as partes puras do importador — validacao de formato, nome
 * livre no destino e o resumo. Abrir o seletor de verdade e uma tela do iOS;
 * nao ha o que testar aqui fora do aparelho, e sem este stub o import do modulo
 * derruba o arquivo de teste inteiro.
 */
export async function getDocumentAsync() {
  return { canceled: true, assets: null };
}
