// Design tokens do app.
//
// Ponte transitoria: hoje apenas reexporta os tokens do template em
// `src/constants/theme.ts`. A Issue #2 (Design System) substitui este arquivo
// por `colors.ts`, `typography.ts` e `spacing.ts` proprios, mantendo este
// modulo como ponto unico de entrada (`@theme`).
export * from '@/constants/theme';
