import AsyncStorage from '@react-native-async-storage/async-storage';

import type { PersistedSettings } from '@/stores/settings-store';

const SETTINGS_KEY = '@connext/settings';

const SCHEMA_VERSION = 1;

interface StoredSettings {
  version: number;
  savedAt: number;
  settings: PersistedSettings;
}

/**
 * Grava as preferências.
 *
 * O sleep timer **não** é gravado de propósito: ele é um compromisso com o
 * relógio ("me deixe dormir em 30 minutos"), não uma preferência. Restaurá-lo
 * na abertura seguinte faria o app pausar sozinho num momento que o usuário não
 * pediu — ou, pior, um timer já expirado pausaria a primeira faixa da sessão.
 */
export async function saveSettings(settings: PersistedSettings): Promise<void> {
  const payload: StoredSettings = { version: SCHEMA_VERSION, savedAt: Date.now(), settings };
  try {
    await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(payload));
  } catch (error) {
    console.warn('[storage] não foi possível salvar as preferências:', error);
  }
}

/** Lê as preferências, ou `null` quando não há nada salvo ou o formato mudou. */
export async function loadSettings(): Promise<PersistedSettings | null> {
  try {
    const json = await AsyncStorage.getItem(SETTINGS_KEY);
    if (!json) return null;

    const parsed = JSON.parse(json) as Partial<StoredSettings>;
    if (parsed?.version !== SCHEMA_VERSION || !parsed.settings) return null;

    const stored = parsed.settings;
    // Cada campo é validado por tipo em vez de confiar no JSON: um valor
    // corrompido aqui vira um `undefined` no store, e o interruptor da tela
    // ficaria num estado que o React reclama por ser não-controlado.
    return {
      fadeEnabled: typeof stored.fadeEnabled === 'boolean' ? stored.fadeEnabled : false,
      fadeSeconds: typeof stored.fadeSeconds === 'number' ? stored.fadeSeconds : 2,
      normalizationEnabled:
        typeof stored.normalizationEnabled === 'boolean' ? stored.normalizationEnabled : false,
    };
  } catch (error) {
    console.warn('[storage] não foi possível ler as preferências:', error);
    return null;
  }
}

/** Apaga as preferências salvas. Usado pelo "restaurar padrões". */
export async function clearSettings(): Promise<void> {
  try {
    await AsyncStorage.removeItem(SETTINGS_KEY);
  } catch (error) {
    console.warn('[storage] não foi possível limpar as preferências:', error);
  }
}
