/**
 * Stub do `@bacons/apple-targets`.
 *
 * O modulo real fala com `UserDefaults` do App Group, que so existe no
 * aparelho. Os testes cobrem a validacao do comando, que e pura — mas o import
 * no topo do arquivo acontece de qualquer forma.
 */
export class ExtensionStorage {
  static reloadWidget() {}
  static reloadControls() {}
  set() {}
  get() {
    return null;
  }
  remove() {}
}
