<p align="center">
  <img src="store/logo/marca.png" width="128" alt="Connext Music — X formado por duas semínimas cruzadas">
</p>

<h1 align="center">Connext Music</h1>

<p align="center">
  Player de música local para iPhone. Sem streaming, sem conta, sem internet.
</p>

---

Player de música local para iOS. O app varre os arquivos de áudio que você adiciona à pasta
`Documents/` do próprio app (via iTunes File Sharing ou o app Arquivos) e os reproduz com suporte a
background playback, lock screen e Control Center.

**Stack:** Expo SDK 57 (managed + CNG) · React Native 0.86 · TypeScript · expo-router

> Este README acompanha a evolução do projeto. O escopo completo está no
> [PRD](./docs/PRD_Music_Player_React_Native.md) e o roteiro de execução no
> [plano de implementação](./docs/implementation-plan.md).

---

## Estado atual

**28 de 28 issues concluídas.** Todos os milestones fechados, com as ressalvas anotadas abaixo.

| Issue                                                               | Escopo                               | Milestone | Status       |
| ------------------------------------------------------------------- | ------------------------------------ | --------- | ------------ |
| [#1](https://github.com/narcisojunior-dev/Connext-Music/issues/1)   | Setup: dev client + arquitetura base | v0.1      | ✅           |
| [#2](https://github.com/narcisojunior-dev/Connext-Music/issues/2)   | Design System: tokens e componentes  | v0.1      | ✅           |
| [#3](https://github.com/narcisojunior-dev/Connext-Music/issues/3)   | Navegação: tabs + player modal       | v0.1      | ✅           |
| [#4](https://github.com/narcisojunior-dev/Connext-Music/issues/4)   | Estado global: Zustand + types       | v0.1      | ✅           |
| [#5](https://github.com/narcisojunior-dev/Connext-Music/issues/5)   | Scanner de arquivos iOS              | v0.2      | ✅           |
| [#6](https://github.com/narcisojunior-dev/Connext-Music/issues/6)   | Metadados ID3 + artwork em cache     | v0.2      | ✅           |
| [#7](https://github.com/narcisojunior-dev/Connext-Music/issues/7)   | Persistência + scan incremental      | v0.2      | ✅           |
| [#8](https://github.com/narcisojunior-dev/Connext-Music/issues/8)   | Player de áudio + background         | v0.3      | ✅           |
| [#9](https://github.com/narcisojunior-dev/Connext-Music/issues/9)   | Fila, shuffle e repeat               | v0.3      | ✅           |
| [#10](https://github.com/narcisojunior-dev/Connext-Music/issues/10) | Tela de Biblioteca completa          | v0.3      | ✅           |
| [#11](https://github.com/narcisojunior-dev/Connext-Music/issues/11) | Tela do Player + saltos de 10s       | v0.4      | ✅           |
| [#12](https://github.com/narcisojunior-dev/Connext-Music/issues/12) | Mini player                          | v0.4      | ✅           |
| [#13](https://github.com/narcisojunior-dev/Connext-Music/issues/13) | Busca global                         | v0.5      | ✅           |
| [#14](https://github.com/narcisojunior-dev/Connext-Music/issues/14) | Playlists: CRUD e reordenação        | v0.5      | ✅           |
| [#15](https://github.com/narcisojunior-dev/Connext-Music/issues/15) | Favoritos + ações de long-press      | v0.5      | ✅           |
| [#16](https://github.com/narcisojunior-dev/Connext-Music/issues/16) | Animações e microinterações          | v0.5      | ✅\*         |
| [#17](https://github.com/narcisojunior-dev/Connext-Music/issues/17) | Estatísticas de reprodução           | v0.6      | ✅           |
| [#18](https://github.com/narcisojunior-dev/Connext-Music/issues/18) | Ajustes, sleep timer e manutenção    | v0.6      | ✅\*\*       |
| [#19](https://github.com/narcisojunior-dev/Connext-Music/issues/19) | Importação via Document Picker       | v0.6      | ✅           |
| [#20](https://github.com/narcisojunior-dev/Connext-Music/issues/20) | Modo carro                           | v0.7      | ✅           |
| [#21](https://github.com/narcisojunior-dev/Connext-Music/issues/21) | Equalizador básico                   | v0.7      | 🚫\*\*\*     |
| [#22](https://github.com/narcisojunior-dev/Connext-Music/issues/22) | Compartilhamento de playlists        | v0.7      | ✅           |
| [#23](https://github.com/narcisojunior-dev/Connext-Music/issues/23) | Widget iOS (tela de início)          | v0.8      | ✅\*\*\*\*   |
| [#24](https://github.com/narcisojunior-dev/Connext-Music/issues/24) | Atalhos Siri                         | v0.8      | ✅\*\*\*\*\* |
| [#25](https://github.com/narcisojunior-dev/Connext-Music/issues/25) | Otimização de performance            | v0.9      | ✅           |
| [#26](https://github.com/narcisojunior-dev/Connext-Music/issues/26) | Testes automatizados                 | v0.9      | ✅           |
| [#27](https://github.com/narcisojunior-dev/Connext-Music/issues/27) | Preparação para App Store            | v1.0      | ✅           |
| [#28](https://github.com/narcisojunior-dev/Connext-Music/issues/28) | Biblioteca por pastas                | v0.7      | ✅           |

\* A #16 está fechada exceto por um item: o gradiente do player **não** usa a cor dominante da artwork, e sim uma cor derivada do hash do id da faixa. Amostrar a imagem exigiria decodificar os pixels em JS ou adicionar outro módulo nativo — ver o commit da #16.

\*\* A #18 não traz o interruptor de "pular silêncio": detectar silêncio exige decodificar PCM, e o Track Player 4.1.2 não expõe nada para isso. O "crossfade" da issue virou **fade** — há uma única instância de player, então não dá para sobrepor duas faixas. Detalhes no commit da #18.

\*\*\* A #21 (equalizador) **não é viável** com a stack atual: o `react-native-track-player` não expõe nenhum método de efeito, e o motor por baixo (`SwiftAudioEx` sobre `AVPlayer`) não tem `AVAudioUnitEQ` nem tap de áudio. Aplicar o efeito exigiria forkar o motor ou substituir o RNTP por um módulo nativo sobre `AVAudioEngine`. A pesquisa completa está no comentário da issue.

\*\*\*\* O widget da #23 **mostra** a faixa atual e atualiza na troca, mas os botões **abrem o app** em vez de controlar a reprodução no lugar. O widget roda em outro processo e não alcança o player; controle de verdade exigiria um `AppIntent` mais uma ponte para o processo do app, que só funcionaria enquanto ele estivesse vivo.

\*\*\*\*\* Os atalhos da #24 **abrem o app** para executar. O `AppIntent` roda em Swift e não alcança o Track Player, que vive no JavaScript — ele deixa o pedido no App Group e traz o app para a frente, que é quem age.

> ⚠️ As issues #19 e #20 acrescentaram módulos nativos (**`expo-document-picker`**, **`expo-keep-awake`**,
> **`expo-screen-orientation`**) e a #20 mudou a orientação suportada no `app.json`. Um dev client compilado
> antes delas não tem esses módulos. Rode `npx expo run:ios` uma vez para recompilar.

> ⚠️ A #23 acrescentou uma **extensão nativa** (o widget) e um **App Group**. Isso não é fast refresh: exige `npx expo prebuild -p ios --clean` seguido de `npx expo run:ios`. O App Group também precisa existir na sua conta Apple para instalar em aparelho — no simulador funciona sem isso.

O fluxo principal está completo: o app escaneia a pasta `Documents/` (ou importa pelo seletor do
iOS), lê as tags, persiste a biblioteca, reproduz com fila, shuffle e repeat, busca, organiza em
playlists e favoritos, registra estatísticas e oferece ajustes de reprodução com sleep timer. O que
resta são as issues de refinamento e distribuição (#20 em diante).

> ⚠️ **Cinco critérios de aceite seguem sem verificação** por dependerem de toque real ou aparelho
> físico. A lista está em [O que só o aparelho verifica](#o-que-só-o-aparelho-verifica).

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

`ios/` e `android/` são geradas a partir do `app.json` e **não são versionadas**:

```bash
npx expo prebuild --clean            # as duas
npx expo prebuild -p ios --clean     # só iOS
npx expo prebuild -p android --clean # só Android
```

### Android

O app roda em Android, mas **três recursos são exclusivos do iOS** e simplesmente não aparecem lá:
o widget da tela de início (WidgetKit), os atalhos do Siri (App Intents) e o Liquid Glass — este
último cai para `BlurView` através do `GlassSurface`. O resto — reprodução em segundo plano, fila,
playlists, busca, pastas, estatísticas — é comum às duas plataformas.

Para compilar é preciso um JDK e o SDK do Android. Se você tem o Android Studio instalado, o JDK
vem com ele:

```bash
export JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home"
export ANDROID_HOME="$HOME/Library/Android/sdk"
export PATH="$JAVA_HOME/bin:$ANDROID_HOME/platform-tools:$PATH"

npx expo run:android          # compila e instala num emulador ou aparelho
cd android && ./gradlew assembleDebug   # só o APK
```

O ícone adaptativo sai do mesmo `store/logo/render.py` que o do iOS, com o primeiro plano recuado
para 62% — o Android recorta em círculo, quadrado ou squircle conforme o launcher, e só os 66%
centrais são garantidos.

> ⚠️ **O Android exige um patch no `react-native-track-player`.** A versão 4.1.2 chama
> `Arguments.fromBundle(track.originalItem)`, mas `originalItem` é `Bundle?` no RN 0.86 e o Kotlin
> recusa — o build quebra em `compileDebugKotlin`, dentro da biblioteca, não no nosso código. O
> patch de duas linhas está em `patches/` e é reaplicado sozinho pelo `postinstall`
> (`patch-package`).
>
> Isto é o risco de manutenção do RNTP, registrado desde a issue #8, se manifestando. A saída
> definitiva é a v5 da biblioteca (ainda em alpha) ou migrar para o `expo-audio`, que é de primeira
> parte.

### Rodando no iPhone (aparelho real)

Vários comportamentos **não existem no simulador** — ver a lista no fim desta seção. Para testá-los:

**Configuração inicial** (uma vez por máquina/aparelho):

1. **Apple ID no Xcode:** Xcode → Settings → Accounts → **+**. Conta gratuita serve.
2. **Modo de Desenvolvedor no iPhone:** Ajustes → Privacidade e Segurança → Modo de Desenvolvedor →
   ligar → reiniciar. (iOS 16+)
3. Conecte o iPhone por cabo e confie no Mac.

**A cada instalação:**

```bash
npx expo run:ios --device     # lista os aparelhos; escolha o seu
```

Na primeira vez ele pergunta qual time de desenvolvimento usar para assinar. Depois de instalar, o
iPhone recusa abrir o app até você confiar no certificado: Ajustes → Geral → **VPN e Gerenciamento
de Dispositivo** → seu Apple ID → Confiar.

Com o app instalado, suba o bundler:

```bash
npm start
```

O iPhone precisa estar **na mesma rede Wi-Fi** que o Mac — o dev client busca o bundle pela rede.

> ⚠️ **O `prebuild` apaga a configuração de assinatura.** As pastas `ios/` e `android/` não são
> versionadas (CNG), então o time de desenvolvimento precisa estar em `app.json` como
> `expo.ios.appleTeamId` para sobreviver. Sem isso, cada `prebuild` exige reconfigurar no Xcode.

> Com conta gratuita, o perfil de provisionamento **expira em 7 dias** e o app para de abrir até ser
> reinstalado. Com o Apple Developer Program, dura um ano.

#### O que só o aparelho verifica

Estes critérios de aceite estão implementados mas **não foram observados** — o simulador não os
reproduz e não há como automatizar o toque:

| Origem   | O que testar                                                                                          |
| -------- | ----------------------------------------------------------------------------------------------------- |
| #8, #11  | Controles na tela de bloqueio e na Central de Controle: título, artista, capa, play/pause, ±10s, seek |
| #8       | Controles de fones físicos e AirPods (play/pause, próxima)                                            |
| #11      | Arrastar o slider de progresso; retorno háptico dos botões                                            |
| #10      | Scroll a 60fps com mais de 100 faixas                                                                 |
| #12      | Gestos do mini player: toque abre o player, arrasto horizontal pula faixa, arrasto para baixo encerra |
| #14, #15 | Arrastar para reordenar playlist; menu de long-press; compartilhar e remover faixa                    |
| #16      | Escala do play/pause, pulso e crossfade da capa, marquee, subida do mini player — e se rodam a 60fps  |
| #16      | Intensidade do háptico por intenção: leve no transporte, média ao favoritar, forte no long-press      |
| #18      | Fade no fim da faixa, normalização por ReplayGain e o fade-out do sleep timer — tudo isso é ouvido    |
| #19      | O seletor de arquivos do iOS: filtro de tipos, seleção múltipla e cópia vinda de iCloud/Drive         |
| #20      | Legibilidade do modo carro a 1 m, rotação para paisagem e o auto-lock realmente desativado            |
| #22      | A folha de compartilhamento e o seletor de arquivos do iOS ao exportar/importar playlists             |
| #23      | O widget na tela de início: aparece na galeria, mostra a faixa e atualiza ao trocar de música         |
| #24      | Os atalhos no app Atalhos e por voz: "tocar aleatória", "pausar", "tocar playlist X"                  |

> A correção do commit `6e1e244` foi motivada por um destes: opções de sessão de áudio inválidas
> para a categoria `playback` impediam o Now Playing de aparecer. O simulador aceitava a
> configuração errada em silêncio — **o teste em aparelho é o que fecha essa lacuna**.

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

---

## Navegação

`expo-router` com file-based routing. A árvore de rotas:

```
src/app/
├── _layout.tsx           # Stack raiz: ThemeProvider + tema de navegação
├── (tabs)/
│   ├── _layout.tsx       # Tab Navigator (blur + cores do design system)
│   ├── index.tsx         # Biblioteca
│   ├── search.tsx        # Busca
│   ├── playlists.tsx     # Playlists
│   └── settings.tsx      # Ajustes
├── player.tsx            # Player (fullScreenModal)
├── playlist/[id].tsx     # Detalhe de playlist
└── design-system.tsx     # Demonstração dos tokens e componentes
```

O **player não é uma aba** — é apresentado como `fullScreenModal` pelo Stack raiz, então cobre a
tab bar e entra com slide-up. Ele também é alcançável por deep link (`connextmusic://player`) e,
no futuro, pela lock screen; nesses casos ele é a única tela da pilha, então o botão de minimizar
cai para a Biblioteca em vez de chamar um `router.back()` que não teria para onde voltar.

No iOS a tab bar usa `position: absolute` + `BlurView` para o glassmorphism do PRD. Isso tem uma
consequência prática: **telas com scroll precisam de padding inferior**, senão o último item fica
escondido atrás da barra.

Todas as rotas estão implementadas. Telas sem conteúdo — a Biblioteca sem música, o Player sem faixa
ativa, as Estatísticas sem reproduções — usam o `EmptyState`, que diz o que fazer em seguida.

O `PlaceholderScreen`, que estampava "EM CONSTRUÇÃO · Issue #N", foi removido: não há mais tela por
implementar, e ele já tinha causado um bug — a Biblioteca vazia se anunciava como inacabada logo na
primeira abertura.

---

## Biblioteca (Tela Principal)

A tab principal do app. Exibe a coleção de músicas do usuário em **4 modos de visualização**,
alternáveis por uma barra de pills horizontal:

| Aba          | Componente      | Comportamento                                                       |
| ------------ | --------------- | ------------------------------------------------------------------- |
| **Todas**    | `TrackList`     | Lista flat alfabética — `FlatList` com `getItemLayout` (60fps)      |
| **Artistas** | `ArtistSection` | `SectionList` agrupada, headers sticky com contagem e duração total |
| **Álbuns**   | `AlbumGrid`     | Grid 2 colunas com artwork quadrado                                 |
| **Gêneros**  | `GenreList`     | Lista com ícone colorido, contagem e chevron                        |

- **Pull-to-refresh** em qualquer aba inicia o scan, com barra de progresso animada (spring via
  Reanimated) mostrando arquivo atual e progresso.
- **Tocar uma faixa** abre o player fullscreen e inicia a reprodução de toda a lista do contexto
  atual (álbum, artista, gênero ou lista completa).
- Cada faixa exibe **artwork** (imagem real via `expo-image`) ou **placeholder colorido** gerado a
  partir de um hash do ID, com ícone de nota musical.
- `TrackList` é otimizada: `getItemLayout` fixo (64pt), `removeClippedSubviews`,
  `maxToRenderPerBatch: 15`, `windowSize: 7` — mantém 60fps com 1000+ itens.
- **Álbuns e Artistas são derivados**, nunca armazenados. São agrupados em runtime pelas funções em
  `src/utils/library-helpers.ts` e recalculados via `useMemo` quando a lista de faixas muda.

Componentes em `src/components/library/`:

| Componente      | Responsabilidade                                   |
| --------------- | -------------------------------------------------- |
| `TrackItem`     | Linha com artwork, título, artista, duração        |
| `TrackList`     | `FlatList` otimizada com empty state e header slot |
| `ScanProgress`  | Barra animada do scan (lê direto do store)         |
| `LibraryTabs`   | Pills horizontais com micro-animação de scale      |
| `ArtistSection` | `SectionList` agrupada por artista                 |
| `AlbumGrid`     | Grid 2 colunas com cards responsivos               |
| `GenreList`     | Lista de gêneros com contagem e ícone colorido     |

---

## Reprodução

`react-native-track-player` 4.1.2, com o serviço de playback registrado em `index.js` — antes de
qualquer tela montar, porque o Track Player o executa fora da árvore do React, inclusive com o app
em segundo plano.

```ts
await playQueue(tracks, index); // toca a partir de uma posição
await togglePlay();
await seekTo(30);
await skipToNext();
```

- `src/services/player/playback-service.ts` — setup, capabilities e os handlers dos comandos
  remotos (lock screen, Control Center, fones)
- `src/services/player/queue-manager.ts` — a API que as telas usam

**O estado real do áudio manda.** A UI reflete o player, nunca o contrário: `PlaybackState` e
`PlaybackProgressUpdated` escrevem no `usePlayerStore`, então a tela fica correta mesmo quando o
comando veio da tela de bloqueio e não de um toque no app.

### Tela do player

Capa grande, slider arrastável e controles completos, com o fundo em gradiente na cor da faixa
coberto por blur — o glassmorphism do PRD.

**Saltos de ±10s** (`skipForward`/`skipBackward`) com os limites tratados: retroceder antes do
início para em 0s, e avançar além do fim passa para a próxima faixa em vez de buscar uma posição
que não existe. Os mesmos saltos aparecem na tela de bloqueio e no Control Center via
`Capability.JumpForward`/`JumpBackward`, com o intervalo declarado em `updateOptions` — sem isso o
iOS mostraria o padrão de 15s, divergindo do que o app faz.

> Os ícones de ±10s são deliberadamente diferentes dos de faixa anterior/próxima. Confundir os dois
> é frustrante: um perde a posição da música, o outro não.

O `ProgressSlider` foi escrito com gesture-handler + reanimated em vez de
`@react-native-community/slider`: o gesto roda na thread de UI, então o indicador acompanha o dedo
mesmo com o JS ocupado — e evita mais um módulo nativo de terceiros. Enquanto o usuário arrasta, o
componente ignora o progresso vindo do player; sem isso, cada atualização (1×/s) puxaria o indicador
de volta.

> ⚠️ `GestureHandlerRootView` envolve o app em `_layout.tsx`. Sem essa raiz, **todo `GestureDetector`
> da árvore é ignorado em silêncio** — o slider simplesmente não responderia ao arraste.

A cor do gradiente e do placeholder vem do hash do id da faixa, **não** da artwork. Extrair a cor
dominante da imagem é escopo da issue #16.

### Mini player

Barra acima da tab bar com artwork, título, artista, play/pause, próxima e uma linha fina de
progresso. Vive em `(tabs)/_layout.tsx` como **irmão** do navegador, não dentro de uma tela — assim
sobrevive à troca de abas em vez de remontar a cada navegação.

Gestos: toque abre o player, arrasto horizontal pula faixa, arrasto para baixo encerra.

> Arrastar para baixo **para a reprodução**, não apenas esconde a barra. Só esconder deixaria música
> tocando sem nenhum controle na tela, e o usuário não teria como voltar a ela.

O espaço reservado no fim das listas vem de `useContentBottomInset()`, que soma tab bar + área
segura + mini player **quando ele está visível**. Reservar a altura fixa deixaria um vão visível
quando nada está tocando; era por isso que as quatro listas repetiam um `paddingBottom: 120`
hardcoded, agora substituído.

### Fila e modos

```ts
await setQueue(tracks);
await addToQueue(track);
await removeFromQueue(2);
await moveQueueItem(0, 3);
getQueue();
await cycleRepeatMode(); // off → track → queue → off
await toggleShuffle();
```

Cada operação toca os dois lados: o store (que a UI lê) e o Track Player (que toca). Duas decisões
de projeto por trás disso:

- **Repeat é configurado no Track Player, não decidido em JS.** É ele que escolhe o que tocar quando
  uma faixa acaba; uma decisão paralela do lado do JS chegaria depois do silêncio entre as faixas.
- **Ligar o shuffle não interrompe a faixa atual.** Ela fica na posição 0 e só o que vem depois é
  reordenado, via `removeUpcomingTracks` + `add`. Reconstruir a fila com `reset` cortaria o áudio no
  meio.

O embaralhamento é um Fisher-Yates — uma permutação completa, não sorteios independentes. É isso que
garante que **toda faixa toque uma vez antes de qualquer repetição**. O store guarda a ordem original
em `originalOrder` para poder restaurá-la ao desligar o shuffle, reencontrando a faixa atual nela.

Fone desconectado pausa a reprodução em vez de continuar no alto-falante — retomar sozinho quando o
fone volta faria a música tocar alto em situações indesejadas.

### A fila na tela

O ícone de lista no player abre a fila como um modal sobre ele — não como rota: sair dali tem que
devolver exatamente a tela de onde se veio, e empilhar mais uma rota faria o botão de voltar do
player passar por ela.

Tocar numa faixa pula até ela, segurar reordena e o "x" remove. **A faixa tocando não pode ser
removida dali**: tirá-la exigiria decidir o que tocar em seguida, e isso é função dos botões de
pular. As já tocadas ficam esmaecidas, senão não dá para saber o que ainda vem.

> Esse botão passou nove issues sem fazer nada — renderizava e respondia ao toque, mas não tinha
> `onPress`. Existe hoje um teste (`tests/dead-buttons.test.ts`) que varre as telas atrás de
> `IconButton` sem ação e falha apontando arquivo, linha e rótulo.

> ⚠️ **Risco de manutenção conhecido.** O RNTP 4.1.2 é um módulo da arquitetura legada (herda de
> `RCTEventEmitter`, sem `codegenConfig`) e só funciona no RN 0.86 através da camada de interop. O
> React Native já anunciou a remoção gradual do código legado, e a v5 do RNTP ainda está em alpha.
> A alternativa de primeira parte é o `expo-audio`, que no SDK 57 cobre background playback e
> controles de tela de bloqueio (`setActiveForLockScreen`) — vale reavaliar se a interop quebrar.

---

## Persistência e scan incremental

A biblioteca é salva no AsyncStorage e recarregada na abertura do app, então as faixas aparecem
sem esperar um scan. 500 faixas carregam em ~9 ms no simulador.

O scan é **incremental por construção**: `generateTrackId` já embute a data de modificação do
arquivo, então "arquivo inalterado" é literalmente "mesmo id". Um scan reaproveita essas faixas sem
reabrir o arquivo — a leitura das tags é a parte cara — e só processa o que é novo ou mudou. Na
prática, o segundo scan da mesma pasta cai de ~42 ms para ~17 ms.

```ts
const { tracks, reused, processed, removed, remappedIds } = await scanMusicLibrary({ knownTracks });
```

Duas consequências que valem conhecer:

- **`playCount`, `lastPlayedAt` e `isFavorite` são carregados adiante.** Esses campos não vêm das
  tags, são histórico de uso. Ao reprocessar um arquivo reeditado, a faixa nova nasce zerada — sem
  esse cuidado o usuário perderia os favoritos toda vez que corrigisse uma tag.
- **Editar um arquivo muda o `id` dele.** O scan devolve `remappedIds` (antigo → novo) e as
  playlists são remapeadas, senão a faixa sumiria delas silenciosamente.

O formato salvo é versionado: se `SCHEMA_VERSION` não bater, o cache é descartado e o app
reescaneia, em vez de entregar objetos com campos faltando para a UI.

> ⚠️ `hydrate()` é deduplicado por uma promessa em andamento e não sobrescreve um scan que tenha
> terminado durante a leitura do disco. As duas coisas foram necessárias: o guarda `isHydrated`
> sozinho é checado **antes** do `await`, então duas telas montando no mesmo frame passavam por ele
> e a leitura mais lenta apagava o resultado do scan.

---

## Favoritos e ações de faixa

Coração no `TrackItem` e no player, com aba **Favoritas** na Biblioteca. Favoritar persiste junto da
biblioteca (é campo da `Track`, carregado adiante em cada scan — ver issue #7).

A animação de "like" pulsa **só ao favoritar**, não ao remover: ela celebra uma ação positiva, e
repeti-la ao desfavoritar daria o sinal errado.

O toque longo abre uma folha com adicionar à fila, adicionar a playlist, favoritar, ver metadados
completos, compartilhar o arquivo e remover da biblioteca. Ela troca de conteúdo internamente em vez
de empilhar modais — modal sobre modal no iOS trava a animação e deixa o gesto de fechar ambíguo.

Remover uma faixa da biblioteca também a tira das playlists; deixá-la lá criaria um id órfão que
some da tela sem explicação.

> No player, o estado de favorito vem da **biblioteca**, não da faixa na fila: a fila é uma cópia do
> momento em que a reprodução começou e não refletiria um favoritar posterior.

---

## Remover ou apagar

A folha de long-press tem **duas** ações que parecem a mesma coisa e não são:

| Ação                      | O que faz                                                                          |
| ------------------------- | ---------------------------------------------------------------------------------- |
| **Remover da biblioteca** | Tira a faixa da lista. O arquivo continua no aparelho e **volta no próximo scan**. |
| **Apagar do aparelho**    | Apaga o arquivo. Irreversível — o sandbox do iOS não tem lixeira.                  |

A segunda pede confirmação **duas vezes**: é a única ação do app que destrói algo que o usuário não
tem como recuperar. Junto do arquivo vão a capa em cache (que ficaria órfã) e as referências nas
playlists. Se a faixa estiver tocando, a reprodução para antes — senão o player seguiria com um
arquivo que não existe mais e o próximo comando falharia sem explicação na tela.

Quando o iOS recusa a exclusão, a faixa **continua** na biblioteca e o alerta diz isso, em vez de
sumir da lista e reaparecer no scan seguinte.

---

## Playlists

CRUD completo com reordenação por arrastar, persistido no AsyncStorage junto da biblioteca.

O detalhe importante é o mesmo da issue #7: **playlists guardam só `trackIds`**. A tela resolve os
ids contra um índice da biblioteca e **ignora os que não existem mais** — o arquivo pode ter saído
do disco desde que foi adicionado, e a playlist não deve quebrar por isso.

A persistência usa uma assinatura única no store em vez de salvar dentro de cada uma das oito ações
que mexem na lista; assim não há como esquecer de uma. A hidratação repete o guarda contra corrida
da biblioteca: uma playlist criada enquanto o disco é lido tem precedência sobre o cache.

O mosaico da capa usa as 4 primeiras faixas — com menos de 4, mostra um bloco só, porque uma grade
pela metade parece defeito, não estilo.

---

## Busca

Busca em tempo real por título, artista, álbum e gênero, com resultados agrupados por categoria,
filtros, ordenação e histórico persistido.

**A busca ignora acentos** — quem digita "coracao" acha "Coração". Em português isso não é
refinamento: ninguém acentua ao buscar no teclado do iPhone.

Duas decisões de desempenho e uma de produto:

- **O índice é construído uma vez por mudança da biblioteca**, não a cada tecla. Normalizar 1000
  faixas × 4 campos a cada caractere digitado seria o gargalo da tela. Busca de 120 faixas leva
  ~7 ms; o critério do PRD é < 100 ms para 1000.
- **Debounce de 300 ms** entre digitar e buscar.
- **Artistas e álbuns só aparecem quando o _nome_ deles casa** com o termo — e não todos os artistas
  das faixas encontradas, o que encheria a seção de ruído.

O destaque do termo compara sobre o texto normalizado mas recorta o **original**, para exibir
"Coração" mesmo quando a busca foi "coracao". Isso exige que a normalização preserve o comprimento
do texto, e é por isso que o `trim()` fica fora dela.

O histórico guarda os 10 últimos termos; repetir uma busca promove o termo ao topo em vez de
duplicar.

---

## Compartilhar playlists (issue #22)

Uma playlist vira um arquivo `.connextplaylist.json`, aberto pela folha de compartilhamento do iOS.
Importar é o caminho inverso, pelo seletor de arquivos, no botão de download da aba **Playlists**.

O arquivo guarda **título, artista, álbum e duração — nunca os `trackIds`**. O id de uma faixa é um
hash do caminho e da data de modificação do arquivo, então não significa nada em outro aparelho;
exportar ids produziria uma playlist que só funciona em quem a criou.

Ao importar, cada entrada é procurada na biblioteca local por **título + artista**, ignorando acento
e caixa — o mesmo tratamento da busca. A duração ficou de fora do critério de propósito: o mesmo
álbum ripado de fontes diferentes varia alguns segundos, e usá-la descartaria pares corretos. O que
não for encontrado é listado pelo nome, porque uma playlist que chega pela metade sem explicação
parece defeito do app, e não ausência de arquivos.

A validação distingue três casos, que pedem ações diferentes de quem está importando: não é JSON,
não é um arquivo do Connext, ou foi exportado por uma versão mais nova do app.

---

## Biblioteca por pastas (issue #28)

A aba **Pastas** mostra a biblioteca como ela está no disco, e não como as tags dizem. Quem organiza
a coleção em `Rock/` ou `MPB/1970/` já fez um trabalho de classificação com um critério próprio; a
aba mostra esse trabalho.

`Track.folderPath` guarda o caminho relativo a `Documents/`, derivado do próprio `uri` durante a
varredura — o scanner já descia nas subpastas, só descartava a informação.

> `folderPath` **não** é preservado no `carryUserData`. Aquele helper carrega o que só existe no app
> (favoritos, contagem de reproduções); a pasta é propriedade do arquivo. Se você mover uma música
> de `Rock/` para `MPB/`, o próximo scan tem que refletir isso.

A árvore é derivada em memória, como as playlists inteligentes. Duas decisões de navegação:

- **Pastas de passagem são colapsadas.** `MPB/` que só contém `1970/` e nada solto vira um nó só,
  `MPB/1970`. Sem isso, chegar na música exigiria um toque por nível de uma hierarquia que o usuário
  criou para organizar, não para percorrer.
- **A fila de uma pasta inclui as subpastas.** Quem abre `Rock/` e toca a primeira faixa espera
  ouvir `Rock/` inteiro, não parar quando a faixa acabar.

Faixas na raiz de `Documents/` ficam num nó próprio, sem pasta inventada.

Na importação (issue #19), Ajustes pergunta um nome de pasta antes de abrir o seletor. O seletor do
iOS não informa de que pasta cada arquivo veio, então reconstruir a origem é impossível — nomear o
lote é o mais perto que dá para chegar.

---

## Estatísticas (issue #17)

Acessível por **Ajustes → Estatísticas**. Mostra total de reproduções, tempo ouvido, quantas faixas
já foram tocadas, um gráfico dos últimos 7 dias e os rankings de faixas e artistas.

Duas ressalvas estão escritas na própria tela, porque o número seria enganoso sem elas:

- **O tempo ouvido é estimado.** É `duração × playCount`; como a contagem exige metade da faixa, o
  real fica entre metade disso e isso. Medir de verdade exigiria somar segundos a cada evento de
  progresso e persistir esse total.
- **O gráfico da semana conta em que dia cada faixa foi ouvida pela última vez**, não reproduções
  por dia — o app guarda `lastPlayedAt`, não um histórico.

Uma reprodução só é contada quando a faixa passa de **50%**. Contar no início encheria "Mais
Tocadas" de música pulada no primeiro segundo. `lastPlayedAt`, em compensação, é gravado no início,
que é quando ele de fato vira verdade.

### Playlists inteligentes

**Favoritas**, **Recentemente Adicionadas**, **Mais Tocadas** e **Nunca Tocadas** aparecem no topo
da aba Playlists. São calculadas na hora, não salvas: manter "Mais Tocadas" em dia a cada
reprodução daria mais trabalho que recalcular, e uma lista dessas desatualizada é pior que nenhuma.
Ficam numa rota própria (`/smart/[id]`) e são **somente leitura** — quem define o conteúdo é a
regra, não o usuário.

---

## Ajustes (issue #18)

### Reprodução

- **Fade entre faixas** — baixa o volume no fim da faixa e volta ao normal na seguinte. A issue
  pedia _crossfade_, mas o Track Player mantém uma única instância de player: não há como sobrepor
  duas faixas. O nome segue o que o código faz.
- **Normalizar volume** — usa o **ReplayGain gravado no arquivo**. Não analisa o áudio; medir volume
  de verdade exigiria decodificar cada faixa inteira, o que não cabe num scan no telefone. Arquivo
  sem a tag fica em volume cheio.
- **Pular silêncio não existe.** Detectar silêncio exige decodificar PCM, e o Track Player não expõe
  nada para isso. Não há interruptor na tela: um que não faz nada seria pior que a ausência.

Os três querem escrever no mesmo `setVolume`, então passam por um controlador único que os combina
por multiplicação — sem isso, a última a escrever venceria.

### Sleep timer

5, 15, 30, 45 ou 60 minutos, ou o fim da faixa atual. O volume desce ao longo de 3s antes de pausar:
cortar o som de uma vez acorda quem estava quase dormindo, que é justamente quem ligou o timer.
Enquanto está ativo, aparece um selo no player no lugar da contagem da fila.

O timer roda no **evento de progresso**, não num `setTimeout`: um timer de JS não é confiável com o
app em segundo plano, que é exatamente onde ele precisa funcionar. E ele **não é persistido** — é um
compromisso com o relógio, e restaurar um timer expirado pausaria a primeira faixa da sessão
seguinte.

### Manutenção da biblioteca

Totais de faixas, espaço e duração; reescanear; limpar o cache de capas (com rescan logo em seguida,
senão a biblioteca fica sem imagem nenhuma); e remover faixas cujo arquivo sumiu do disco.

---

## Importar músicas (issue #19)

Botão em **Ajustes** e no estado vazio da Biblioteca, onde vem antes de "escanear" — numa biblioteca
vazia, escanear não tem o que achar.

Os arquivos escolhidos são **copiados** para `Documents/Music/`. Copiar não é uma escolha: o seletor
devolve um arquivo temporário fora do sandbox, que o iOS descarta quando quiser, e uma biblioteca
apontando para ele quebraria sozinha.

A validação é **por extensão**, não pelo MIME que o seletor informa: o iOS entrega
`application/octet-stream` para muita coisa vinda de nuvem, e confiar nisso rejeitaria arquivos
válidos. Nome repetido não sobrescreve — vira `Faixa (2).mp3`. Só é descartado como duplicata quando
nome **e** tamanho batem.

---

## Modo carro (issue #20)

Tela de alto contraste para uso ao dirigir, acessível pelo ícone de carro no player ou por Ajustes.

As cores fogem do design system de propósito: **preto e branco puros**, e não os tons do tema, que
foram escolhidos para conforto em ambiente fechado e perdem legibilidade sob sol direto. Os botões
partem de **88pt** — o dobro dos 44pt das HIG — porque o toque é feito sem olhar, com o carro
andando. O estado pressionado é uma borda branca, não opacidade: um botão 30% mais apagado some no
sol.

`useKeepAwake` impede o bloqueio automático enquanto a tela está aberta; bloqueado, trocar de faixa
exigiria desbloquear o telefone dirigindo. A rotação é liberada **só nesta tela** (um suporte de
carro pode estar montado deitado) e volta a travar em retrato ao sair.

As medidas ficam em `services/car-mode/layout.ts`, fora do componente, para poderem ser testadas sem
montar a árvore — inclusive a regra de que a capa sai quando não há espaço, porque numa tela
apertada é melhor ficar sem imagem do que com botões que exigem mira.

---

## Widget da tela de início (issue #23)

Extensão WidgetKit em SwiftUI, nos tamanhos pequeno e médio. O código nativo vive em
`targets/widget/` e entra no projeto Xcode pelo `@bacons/apple-targets`, então `ios/` continua
gerado e fora do versionamento.

O app e o widget são **processos diferentes** e conversam por um **App Group**:

1. Na troca de faixa e no play/pause, o app grava título, artista e estado no `UserDefaults`
   compartilhado e pede a recarga do widget.
2. A capa não cabe nesse caminho — o widget não lê o sandbox do app —, então a imagem é **copiada**
   para o container compartilhado, sempre com o mesmo nome.

A publicação **não** acontece a cada atualização de progresso: o iOS dá um orçamento de recargas ao
widget, e gastá-lo 1×/s sem mudar nada na tela o esgotaria.

> Os botões **abrem o app** em vez de controlar a reprodução no lugar. O widget não alcança o
> player; controle de verdade exigiria um `AppIntent` mais uma ponte para o processo do app, que só
> funcionaria enquanto ele estivesse vivo. Cada botão é um deep link para
> `connextmusic://widget/<ação>`, que executa e redireciona ao player.

---

## Estado global

Quatro stores [Zustand](https://zustand.docs.pmnd.rs/) em `src/stores/`, sem persistência ainda —
ela chega na issue #7.

| Store              | Responsabilidade                                                               |
| ------------------ | ------------------------------------------------------------------------------ |
| `usePlayerStore`   | Faixa atual, fila, índice, play/pause, repeat, shuffle, progresso              |
| `useLibraryStore`  | Faixas da biblioteca, estado e progresso do scan, favoritos, contagem de plays |
| `usePlaylistStore` | CRUD de playlists e reordenação de faixas                                      |
| `useSettingsStore` | Crossfade, normalização, pular silêncio, sleep timer                           |

Duas decisões de modelagem que valem conhecer antes de mexer:

- **Playlists guardam só `trackIds`**, nunca objetos `Track`. A faixa vive na biblioteca; duplicá-la
  na playlist abriria espaço para os dois lados divergirem quando `playCount` ou `isFavorite`
  mudassem.
- **`Album` e `Artist` são derivados, nunca armazenados.** São o resultado de agrupar as faixas.
  Guardar uma cópia exigiria mantê-la em sincronia a cada scan, e a fonte de verdade continua sendo
  os arquivos em disco.

No `usePlayerStore`, `currentTrack` e `currentIndex` são sempre atualizados juntos por um helper —
é o que impede a fila de apontar para uma faixa e a UI mostrar outra depois de remover ou reordenar
itens.

A Biblioteca é populada pelo scanner (issue #5), via pull-to-refresh ou pelo botão de escanear.

---

## Scanner de arquivos

`src/services/file/file-scanner.ts` varre `Documents/` recursivamente atrás de áudio. Essa é a
única pasta onde o usuário consegue colocar música — o sandbox do iOS bloqueia o resto —, e é o que
as chaves de `infoPlist` acima tornam acessível pelo iTunes File Sharing e pelo app Arquivos.

```ts
const { tracks, failed, elapsedMs } = await scanMusicLibrary((current, total, fileName) =>
  setScanProgress({ current, total, fileName }),
);
```

Aceita `.mp3`, `.m4a`, `.flac`, `.wav`, `.aac` e `.ogg`. Ignora arquivos abaixo de 1 KB (downloads
truncados e os arquivos-fantasma que o iCloud Drive deixa quando o conteúdo ainda não baixou) e
pastas de sistema (`Caches`, `__MACOSX`, `.git`, ocultas).

Três decisões que valem conhecer antes de mexer:

- **A varredura é em duas fases** — primeiro coleta os arquivos, depois processa. A implementação de
  referência do guia usava uma fase só e reportava o total _da pasta atual_, o que fazia a barra de
  progresso reiniciar a cada subpasta. Com duas fases o total é real e o progresso vai de 0 a 100
  uma vez só.
- **`scanMusicLibrary` é assíncrona mesmo a API do `expo-file-system` sendo síncrona.** No SDK 57,
  `list()` e `.size` bloqueiam a thread de JS; sem ceder o event loop periodicamente, um scan de mil
  arquivos congelaria a interface e a barra de progresso só apareceria preenchida no último frame.
- **Erro em um arquivo ou pasta não derruba o scan.** Uma pasta ilegível vira um `console.warn` e a
  varredura segue; arquivos que falham entram na contagem `failed` do resultado.

Os IDs vêm de `generateTrackId(caminho, dataDeModificação)` — dJB2 alargado para 64 bits. Incluir a
data é o que permite ao scan incremental (issue #7) detectar arquivos alterados; se o ID fosse só o
caminho, um arquivo substituído manteria os metadados antigos para sempre.

### Metadados

`tag-parsers.ts` lê as tags direto dos bytes do arquivo, sem dependência de runtime:

| Formato         | Fonte das tags                                    | Duração                           |
| --------------- | ------------------------------------------------- | --------------------------------- |
| MP3             | ID3v2.2/2.3/2.4, com ID3v1 como reserva           | estimada pelo bitrate do 1º frame |
| M4A / MP4 / AAC | átomos iTunes (`©nam`, `©ART`, `trkn`, `covr`, …) | exata, do `mvhd`                  |
| FLAC            | `VORBIS_COMMENT` e bloco `PICTURE`                | exata, do `STREAMINFO`            |

Nada de `music-metadata` (precisa de streams do Node) nem `jsmediatags` (precisa do
`react-native-fs`) — os dois exigiriam polyfills pesados no Hermes para ler o que são, no fim,
alguns cabeçalhos bem documentados.

Detalhes que importam:

- **Só o primeiro 1 MB do arquivo é lido.** Tags e capas vivem no começo; carregar um FLAC de 40 MB
  inteiro para descobrir o título significaria, com 500 faixas, dezenas de gigabytes de leitura.
  `FileHandle.readBytes()` permite ler só o cabeçalho.
- **A duração do MP3 é estimativa**, assumindo bitrate constante — arquivos VBR saem errados. Serve
  para a lista não mostrar 0:00; a duração exata vem do motor de áudio na issue #8. M4A e FLAC dão o
  valor exato de graça, direto do cabeçalho.
- **Nenhum parser lança.** Bytes inesperados devolvem tags vazias e a faixa cai nos fallbacks
  (título do nome do arquivo, "Artista Desconhecido").

As capas embutidas vão para `Caches/artworks/{trackId}.{jpg|png}` — em `Caches/` e não em
`Documents/` porque são reconstruíveis a partir do original, então o iOS pode apagá-las quando o
armazenamento apertar sem o usuário perder nada.

---

#### Quando a tag não presta

Nem todo arquivo traz metadados úteis. O caso que forçou este tratamento: um álbum baixado solto,
**sem ID3v2**, com um **ID3v1 preenchido automaticamente** — títulos `music 1`, `music 2`, `music 3`
e artista vazio — enquanto o nome do arquivo dizia
`01 - EU IA PARAR - Anderson Porto.mp3`. A tag de lixo vencia, e a biblioteca ficava cheia de
"music 8".

A regra hoje, em `file-name-parser.ts`:

1. **ID3v2 sempre vence.** Quem preencheu quis aquilo.
2. Um ID3v1 **com artista** também vence — é uma fonte legítima.
3. Um ID3v1 **sem artista e com título que parece gerado por máquina** (`music 8`, `track 3`,
   `untitled`, só dígitos) é descartado em favor do nome do arquivo. Junto com ele vai o número da
   faixa, que nesses arquivos vinha como 1 em todas.

O nome é decomposto em número, e segmentos separados por hífen. `01 - A - B` não diz sozinho se A é
o título ou o artista — há coleções nas duas convenções. **Quem responde é a pasta: o artista é o
segmento que se repete** entre as faixas vizinhas. Sem repetição — uma coletânea, ou um arquivo
sozinho — o parser devolve artista nulo em vez de chutar.

## Qualidade de código

```bash
npm test              # 281 testes da lógica pura (runner nativo do Node)
npm run lint          # ESLint (eslint-config-expo + prettier)
npm run lint:fix
npm run format        # Prettier em todo o projeto
npm run format:check
npm run typecheck     # tsc --noEmit
```

Os testes cobrem o que é lógica pura — parsers de tags, scanner, stores, persistência,
agrupamentos e formatadores — no runner nativo do Node, **sem dependência de runtime**: os arquivos
sob teste são TypeScript puro e o Node apaga os tipos sozinho. `tests/loader.mjs` resolve o alias
`@/` e troca os módulos nativos por stubs; `tests/helpers/audio-fixtures.ts` monta bytes de MP3,
M4A e FLAC com tags reais, em vez de versionar binários — assim fica explícito **qual** tag cada
caso exercita. Componentes React ficam de fora: precisam de RNTL, que chega na issue #26.

O ESLint roda com o flat config (`eslint.config.js`) e o Prettier integrado como regra, então
problemas de formatação aparecem como erros de lint. As pastas geradas (`ios/`, `android/`,
`dist/`, `graphify-out/`) ficam fora dos dois.

---

## Testes (issues #25 e #26)

```bash
npm test              # 281 testes
npm run test:coverage # com relatório de cobertura
npm run test:watch
```

A suíte roda no **runner nativo do Node**, sem Jest e sem nenhuma dependência de runtime. Um
`tests/loader.mjs` resolve os aliases `@/` e substitui os módulos nativos (`expo-file-system`,
AsyncStorage, `expo-document-picker`, `@bacons/apple-targets`) por stubs em memória. A suíte inteira
leva menos de um segundo.

Cobertura nas camadas que a issue #26 exige acima de 70%:

| Camada    | Linhas  |
| --------- | ------- |
| `stores/` | 93–100% |
| `utils/`  | 90–100% |
| Geral     | 86,7%   |

**Não foi adicionado Jest + React Native Testing Library**, apesar de a issue pedir. A suíte atual já cobre stores, utilitários, parsers e os fluxos de integração; um segundo runner traria um preset
pesado e mais um conjunto de dependências para cobrir o que falta — renderização de componente.
Vale reavaliar se testes de componente virarem prioridade; o que eles pegariam de fato está
registrado na issue.

Três testes fogem do formato e leem o **código-fonte** em vez de executá-lo, porque o defeito que
guardam é a _ausência_ de algo, e não há comportamento para exercitar:

- `dead-buttons.test.ts` — `IconButton` sem `onPress`. Foi assim que o botão da fila passou nove
  issues sem fazer nada.
- `haptics.test.ts` — componente chamando `expo-haptics` direto em vez de `utils/haptics`.
- `file-scanner.test.ts` — cessão do event loop por contagem em vez de tempo (ver #25).
- `import.test.ts` — UTI no lugar de MIME type nos tipos declarados ao seletor de arquivos. Passar
  UTIs fazia o `expo-document-picker` abrir com a lista vazia, e **nenhuma música ficava
  selecionável**.

### O que os testes não alcançam

Áudio, toque, sensores e o sistema operacional. O roteiro está em
[TESTES-APARELHO.md](TESTES-APARELHO.md), com os blocos que precisam de um iPhone real e o registro
de execução.

### Desempenho medido

No simulador, com **1120 faixas**:

| Operação                            | Tempo  |
| ----------------------------------- | ------ |
| Hidratar a biblioteca salva         | 78ms   |
| Scan completo (lê todas as tags)    | 2133ms |
| Scan incremental (reaproveita tudo) | 965ms  |

O scan incremental custava **1702ms** antes da #25: o scanner cedia o event loop a cada 25
arquivos, pagando 44 idas ao `setTimeout` mesmo sem ler nenhuma tag. Passou a ceder por orçamento
de tempo (32ms).

---

## Marca

<img src="store/logo/icone.png" width="96" align="right" alt="Ícone do app">

O símbolo é a letra **X** construída com duas semínimas espelhadas: as hastes se cruzam e o X aparece
na estrutura, em vez de ser desenhado por cima dela. Quem não repara na música vê um X; quem repara
vê duas notas.

Ele **não** tem bandeira de colcheia, e isso foi decidido por teste. Três variantes — bandeira larga,
curta e sem — foram comparadas a 88px, o tamanho em que um ícone é realmente visto. Nas duas
primeiras a bandeira virava um traço solto que competia com o cruzamento e enfraquecia a leitura do
X; sem ela, a diagonal sobrevive inteira.

A geometria é calculada, não estimada: as pontas das hastes são cortadas perpendicularmente ao
próprio eixo (não na horizontal), o espelhamento é exato em `x=512`, e a marca sobe 9,3px para o
centro óptico — a massa desce até a base das cabeças, então centralizar pela caixa a deixaria baixa
demais. As cabeças ficam a 21°, a inclinação da notação manuscrita.

As cores são as do app, num gradiente de `#8CBEFD` a `#2563EB` seguindo a diagonal em que se lê uma
partitura.

| Arquivo                     | Uso                                                    |
| --------------------------- | ------------------------------------------------------ |
| `store/logo/marca.svg`      | Símbolo, fundo transparente                            |
| `store/logo/icone.svg`      | Símbolo sobre o fundo do tema — origem do ícone do app |
| `store/logo/marca-mono.svg` | Monocromática, para fundo claro ou impressão           |
| `store/logo/FILOSOFIA.md`   | A filosofia de design que guiou as escolhas            |

Os PNGs saem de `store/logo/render.py`, um rasterizador próprio, e **não** de um conversor de SVG. O
`qlmanage` do macOS — único conversor disponível aqui — compõe o SVG sobre **branco**: o PNG sai com
canal alfa e passa numa checagem ingênua de `hasAlpha`, mas todos os pixels ficam opacos. Foi assim
que a splash screen apareceu com um quadrado branco atrás da marca.

```bash
python3 store/logo/render.py   # regenera ícone, splash e as variantes
```

Ao trocar ícone ou splash:

1. `npx expo prebuild -p ios --clean` — o catálogo de assets do Xcode é gerado; sem isso o build
   continua com o anterior.
2. **Desinstale o app do aparelho ou simulador antes de reinstalar.** O iOS guarda um snapshot da
   tela de lançamento e continua exibindo o splash antigo mesmo depois de um build novo.

---

## Documentação

- [PRD](./docs/PRD_Music_Player_React_Native.md) — requisitos do produto
- [Guia do Scanner iOS](./docs/Guia_Scanner_iOS_Connext.md) — varredura do sistema de arquivos
- [Plano de implementação](./docs/implementation-plan.md) — as 27 issues, em ordem de dependência
- [GRAPH_REPORT.md](./GRAPH_REPORT.md) — grafo de conhecimento do código

## Licença

Veja [LICENSE](./LICENSE).
