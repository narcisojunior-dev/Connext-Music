import AsyncStorage from '@react-native-async-storage/async-storage';

const HISTORY_KEY = '@connext/search-history';

/** Quantas buscas ficam guardadas. */
export const MAX_HISTORY = 10;

/** Termos buscados, do mais recente para o mais antigo. */
export async function loadSearchHistory(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : [];
  } catch (error) {
    console.warn('[storage] não foi possível carregar o histórico de busca:', error);
    return [];
  }
}

/**
 * Registra um termo no topo do histórico.
 *
 * Repetir uma busca a promove ao topo em vez de duplicar — o histórico é uma
 * lista de atalhos, e ver o mesmo termo três vezes seguidas não ajuda ninguém.
 * A comparação ignora caixa, mas o termo guardado é o que o usuário digitou.
 */
export async function addSearchTerm(term: string): Promise<string[]> {
  const trimmed = term.trim();
  if (!trimmed) return loadSearchHistory();

  const current = await loadSearchHistory();
  const withoutDuplicate = current.filter((t) => t.toLowerCase() !== trimmed.toLowerCase());
  const next = [trimmed, ...withoutDuplicate].slice(0, MAX_HISTORY);

  try {
    await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(next));
  } catch (error) {
    console.warn('[storage] não foi possível salvar o histórico de busca:', error);
  }
  return next;
}

/** Remove um termo específico. */
export async function removeSearchTerm(term: string): Promise<string[]> {
  const next = (await loadSearchHistory()).filter((t) => t !== term);
  try {
    await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(next));
  } catch (error) {
    console.warn('[storage] não foi possível atualizar o histórico de busca:', error);
  }
  return next;
}

/** Apaga o histórico inteiro. */
export async function clearSearchHistory(): Promise<void> {
  try {
    await AsyncStorage.removeItem(HISTORY_KEY);
  } catch (error) {
    console.warn('[storage] não foi possível limpar o histórico de busca:', error);
  }
}
