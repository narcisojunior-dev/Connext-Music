// Tipos do stub, para os testes de concorrência acessarem `control`.
declare const AsyncStorage: {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
  clear(): Promise<void>;
};
export default AsyncStorage;
export declare const control: { delayMs: number; reads: number };
