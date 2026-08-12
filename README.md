# 🎵 Connext Music

Player de música local para iOS. O app varre os arquivos de áudio que você adiciona à pasta
`Documents/` do próprio app (via iTunes File Sharing ou o app Arquivos) e os reproduz com suporte a
background playback, lock screen e Control Center.

**Stack:** Expo SDK 57 (managed + CNG) · React Native 0.86 · TypeScript · expo-router

> Este README acompanha a evolução do projeto. O escopo completo está no
> [PRD](./docs/PRD_Music_Player_React_Native.md) e o roteiro de execução no
> [plano de implementação](./docs/implementation-plan.md).

---

## Estado atual

| Issue                                                             | Escopo                               | Status       |
| ----------------------------------------------------------------- | ------------------------------------ | ------------ |
| [#1](https://github.com/narcisojunior-dev/Connext-Music/issues/1) | Setup: dev client + arquitetura base | ✅ Concluída |
| [#2](https://github.com/narcisojunior-dev/Connext-Music/issues/2) | Design System: tokens e componentes  | ✅ Concluída |
| [#3](https://github.com/narcisojunior-dev/Connext-Music/issues/3) | Navegação: tabs + player modal       | ⏳ Próxima   |

A tela inicial é hoje uma **demonstração do design system** (`src/app/index.tsx`), usada para
verificar tokens e componentes na tela. A issue #3 reestrutura `src/app/` em tabs e a substitui
pela Biblioteca.

---

## Rodando o projeto

Este projeto usa um **development build** (`expo-dev-client`), não o Expo Go. Isso é obrigatório
porque os módulos nativos das próximas issues (Track Player, file system, widgets) não existem no
Expo Go.

### Pré-requisitos

- Node.js e npm
- Xcode + Command Line Tools
- CocoaPods (`brew install cocoapods`)

### Primeira execução

```bash
npm install
npx expo run:ios     # gera ios/, instala os pods, compila e abre no simulador
```

O `run:ios` faz o prebuild automaticamente na primeira vez. Nas execuções seguintes, basta subir o
bundler:

```bash
npm start            # expo start --dev-client
```

Com o app já instalado no simulador, abra-o e ele se conecta ao bundler. O botão de engrenagem no
canto da tela abre o menu de desenvolvimento (ou `cmd+d` no simulador).

### Regenerando as pastas nativas

```bash
npm run prebuild     # expo prebuild --clean
```

---

## Arquitetura

### Continuous Native Generation (CNG)

As pastas `ios/` e `android/` **não são versionadas** — elas são geradas pelo `expo prebuild` a
partir do `app.json`. Isso tem uma consequência prática importante:

> ⚠️ **Nunca edite `ios/*/Info.plist` ou os arquivos do Xcode diretamente.** Qualquer alteração é
> perdida no próximo `prebuild`. Toda configuração nativa vai em `app.json` (ou em um config plugin).

As chaves nativas exigidas pelo player estão declaradas em `app.json` → `expo.ios.infoPlist`:

| Chave                               | Valor       | Para quê                                                |
| ----------------------------------- | ----------- | ------------------------------------------------------- |
| `UIBackgroundModes`                 | `["audio"]` | Continuar tocando com o app minimizado / tela bloqueada |
| `UIFileSharingEnabled`              | `true`      | Expor a pasta do app no iTunes File Sharing             |
| `LSSupportsOpeningDocumentsInPlace` | `true`      | Deixar a pasta visível no app Arquivos do iOS           |
| `NSDocumentsFolderUsageDescription` | texto PT-BR | Justificativa mostrada no prompt de permissão           |

Juntas, essas duas últimas chaves são o que permite ao usuário **arrastar músicas para dentro do
app** — o fluxo principal de entrada de conteúdo do Connext Music.

### Estrutura de pastas

```
src/
├── app/          # rotas (expo-router, file-based routing)
├── components/   # componentes de UI reutilizáveis
├── constants/    # constantes do template (migrando para theme/)
├── hooks/        # hooks compartilhados
├── theme/        # design tokens: cores, tipografia, spacing
├── types/        # interfaces do domínio (Track, Playlist, Album, Artist)
├── stores/       # estado global (Zustand)
├── services/
│   ├── player/   # Track Player: playback service e fila
│   ├── file/     # scanner de arquivos, metadados ID3, importação
│   └── storage/  # persistência local da biblioteca e preferências
└── utils/        # funções puras (formatters, geração de IDs)
```

As pastas de `services/`, `stores/`, `types/` e `utils/` contêm apenas arquivos `index.ts`
placeholder, cada um indicando a issue que o preenche.

### Path aliases

Definidos em `tsconfig.json`. O Metro os resolve automaticamente (`experiments.tsconfigPaths` é
padrão no SDK 57) — **reinicie o bundler** após alterar o `tsconfig.json`.

| Alias           | Aponta para        |
| --------------- | ------------------ |
| `@/*`           | `src/*`            |
| `@/assets/*`    | `assets/*`         |
| `@components/*` | `src/components/*` |
| `@screens/*`    | `src/app/*`        |
| `@hooks/*`      | `src/hooks/*`      |
| `@services/*`   | `src/services/*`   |
| `@stores/*`     | `src/stores/*`     |
| `@types/*`      | `src/types/*`      |
| `@utils/*`      | `src/utils/*`      |
| `@theme/*`      | `src/theme/*`      |

---

## Design System

O app é **dark-only** por design: o conteúdo principal é a artwork do álbum, e um fundo escuro
evita que a UI compita com a capa. Não existe variante light — `app.json` fixa
`userInterfaceStyle: "dark"` para que nem a tela de splash pisque claro.

`src/theme/` (alias `@theme`) é a fonte única de verdade:

| Arquivo         | Conteúdo                                                                        |
| --------------- | ------------------------------------------------------------------------------- |
| `colors.ts`     | 15 tokens da seção 2.1 do PRD (`background`, `surface`, `primary`, `accent`, …) |
| `typography.ts` | 6 escalas: Display, Heading, Title, Body, Caption, Overline                     |
| `spacing.ts`    | Escala 4pt (`xs`…`xxxl`), raios, sombra dos cards e durações                    |
| `index.ts`      | Monta e exporta o objeto `theme`                                                |

Em componentes, use o hook em vez de importar os tokens direto — ele lê o mesmo objeto pelo
Context e deixa a porta aberta para tema dinâmico (cores derivadas da artwork, issue #16):

```tsx
const { colors, spacing } = useTheme();
```

### Componentes base

Todos em `src/components/ui/`. Recebem **tokens**, não números — é o que mantém o espaçamento e as
cores consistentes conforme o app cresce.

| Componente   | Uso                                                                 |
| ------------ | ------------------------------------------------------------------- |
| `Box`        | Container: `background`, `padding`, `gap`, `radius`, `elevated`     |
| `Text`       | Tipografia: `variant` (display…overline) e `color`                  |
| `Button`     | `primary` \| `secondary` \| `ghost`, com `loading` e `fullWidth`    |
| `IconButton` | Botão circular (Ionicons), tamanhos `sm`/`md`/`lg`, estado `active` |

```tsx
<Box background="surface" padding="lg" radius="card" gap="sm" elevated>
  <Text variant="title">Nome da música</Text>
  <Text variant="caption" color="textSecondary">
    Artista
  </Text>
</Box>
```

`ThemeProvider` (em `src/app/_layout.tsx`) envolve o app inteiro, junto do provider de navegação
do expo-router — os dois apontam para a mesma paleta para não haver flash claro entre telas.

> `src/constants/theme.ts` é resíduo do template Expo e está congelado: `Colors` foi repontado para
> a paleta dark, e o arquivo sai do projeto junto com as telas de exemplo na issue #3. Não adicione
> nada lá.

---

## Qualidade de código

```bash
npm run lint          # ESLint (eslint-config-expo + prettier)
npm run lint:fix
npm run format        # Prettier em todo o projeto
npm run format:check
npm run typecheck     # tsc --noEmit
```

O ESLint roda com o flat config (`eslint.config.js`) e o Prettier integrado como regra, então
problemas de formatação aparecem como erros de lint. As pastas geradas (`ios/`, `android/`,
`dist/`, `graphify-out/`) ficam fora dos dois.

---

## Documentação

- [PRD](./docs/PRD_Music_Player_React_Native.md) — requisitos do produto
- [Guia do Scanner iOS](./docs/Guia_Scanner_iOS_Connext.md) — varredura do sistema de arquivos
- [Plano de implementação](./docs/implementation-plan.md) — as 27 issues, em ordem de dependência
- [GRAPH_REPORT.md](./GRAPH_REPORT.md) — grafo de conhecimento do código

## Licença

Veja [LICENSE](./LICENSE).
