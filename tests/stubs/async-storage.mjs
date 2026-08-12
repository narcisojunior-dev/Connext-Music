// AsyncStorage em memoria, com atraso configuravel para exercitar corridas.
const store = new Map();

/** Controle usado pelos testes de concorrencia da hidratacao. */
export const control = { delayMs: 0, reads: 0 };

const wait = () => (control.delayMs ? new Promise((r) => setTimeout(r, control.delayMs)) : null);

export default {
  async getItem(key) {
    control.reads++;
    await wait();
    return store.has(key) ? store.get(key) : null;
  },
  async setItem(key, value) {
    store.set(key, String(value));
  },
  async removeItem(key) {
    store.delete(key);
  },
  async clear() {
    store.clear();
  },
};
