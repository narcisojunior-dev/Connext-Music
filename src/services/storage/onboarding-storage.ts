import AsyncStorage from '@react-native-async-storage/async-storage';

const ONBOARDING_KEY = '@connext/onboarding-seen';

/**
 * O tutorial de primeira execucao ja foi visto?
 *
 * Erro de leitura devolve `true`, e nao `false`: numa falha do storage, e
 * melhor deixar a pessoa entrar direto no app do que prende-la num tutorial
 * que reaparece toda vez.
 */
export async function hasSeenOnboarding(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(ONBOARDING_KEY)) !== null;
  } catch {
    return true;
  }
}

export async function markOnboardingSeen(): Promise<void> {
  try {
    await AsyncStorage.setItem(ONBOARDING_KEY, String(Date.now()));
  } catch (error) {
    console.warn('[onboarding] nao foi possivel marcar como visto:', error);
  }
}

/** Usado pelo "rever tutorial" em Ajustes. */
export async function resetOnboarding(): Promise<void> {
  try {
    await AsyncStorage.removeItem(ONBOARDING_KEY);
  } catch (error) {
    console.warn('[onboarding] nao foi possivel reiniciar:', error);
  }
}
