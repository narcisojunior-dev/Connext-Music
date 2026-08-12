import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import {
  addSearchTerm,
  clearSearchHistory,
  loadSearchHistory,
  MAX_HISTORY,
  removeSearchTerm,
} from '@/services/storage/search-history';

describe('histórico de busca', () => {
  test('guarda do mais recente para o mais antigo', async () => {
    await clearSearchHistory();
    await addSearchTerm('rock');
    await addSearchTerm('jazz');
    assert.deepEqual(await loadSearchHistory(), ['jazz', 'rock']);
  });

  test('repetir um termo o promove ao topo em vez de duplicar', async () => {
    // O histórico é uma lista de atalhos; ver o mesmo termo três vezes não ajuda.
    await clearSearchHistory();
    await addSearchTerm('rock');
    await addSearchTerm('jazz');
    await addSearchTerm('rock');
    assert.deepEqual(await loadSearchHistory(), ['rock', 'jazz']);
  });

  test('a comparação ignora caixa, mas guarda o que foi digitado', async () => {
    await clearSearchHistory();
    await addSearchTerm('Bossa Nova');
    await addSearchTerm('bossa nova');
    const history = await loadSearchHistory();
    assert.equal(history.length, 1, 'não deve criar duas entradas');
    assert.equal(history[0], 'bossa nova', 'a grafia mais recente prevalece');
  });

  test(`mantém no máximo ${MAX_HISTORY} termos`, async () => {
    await clearSearchHistory();
    for (let i = 0; i < MAX_HISTORY + 5; i++) await addSearchTerm(`termo ${i}`);
    const history = await loadSearchHistory();
    assert.equal(history.length, MAX_HISTORY);
    assert.equal(history[0], `termo ${MAX_HISTORY + 4}`, 'o mais recente fica no topo');
  });

  test('termo vazio ou só espaços é ignorado', async () => {
    await clearSearchHistory();
    await addSearchTerm('   ');
    await addSearchTerm('');
    assert.deepEqual(await loadSearchHistory(), []);
  });

  test('remove um termo específico sem tocar nos outros', async () => {
    await clearSearchHistory();
    await addSearchTerm('a');
    await addSearchTerm('b');
    await addSearchTerm('c');
    assert.deepEqual(await removeSearchTerm('b'), ['c', 'a']);
  });

  test('JSON corrompido devolve lista vazia em vez de lançar', async () => {
    const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
    await AsyncStorage.setItem('@connext/search-history', 'não é json');
    assert.deepEqual(await loadSearchHistory(), []);
  });

  test('valores não-string salvos são descartados', async () => {
    const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
    await AsyncStorage.setItem('@connext/search-history', JSON.stringify(['ok', 42, null]));
    assert.deepEqual(await loadSearchHistory(), ['ok']);
  });
});
