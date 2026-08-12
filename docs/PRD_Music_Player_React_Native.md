# PRD — Music Player App (React Native | iOS)

> **Status:** v1.0  
> **Data:** 11/08/2026  
> **Plataforma:** iOS (iPhone)  
> **Stack:** React Native (bare workflow)  
> **Tema:** Dark Mode + Tons de Azul  

---

## 1. Visão Geral

Aplicativo de reprodução de música offline para iOS. O app lê arquivos de áudio (.mp3, .m4a, .flac, .wav, .aac) diretamente da memória interna do iPhone (pasta Arquivos/Files), sem necessidade de streaming ou conexão com a internet. Foco em experiência fluida, design minimalista e performance.

### Diferenciais
- Leitura 100% offline de arquivos locais
- Interface dark mode com tons de azul
- Playback em background com controles na lock screen e Control Center
- Organização automática por metadados (artista, álbum, gênero)
- Fila de reprodução inteligente
- Modo carro (interface simplificada)

---

## 2. Design System

### 2.1 Paleta de Cores

| Token | Hex | Uso |
|-------|-----|-----|
| **Background** | `#0A0E1A` | Fundo principal do app |
| **Surface** | `#161B2E` | Cards, modais, input fields |
| **Surface Elevated** | `#1E2438` | Hover, selected items |
| **Primary** | `#3B82F6` | Botões principais, progress bar, active states |
| **Primary Hover** | `#2563EB` | Botão pressionado |
| **Secondary** | `#60A5FA` | Links secundários, highlights |
| **Accent** | `#22D3EE` | Now playing indicator, waveform, equalizer |
| **Text Primary** | `#F1F5F9` | Títulos, nomes de músicas |
| **Text Secondary** | `#94A3B8` | Artistas, álbuns, metadados |
| **Text Muted** | `#64748B` | Timestamps, labels |
| **Border** | `#1E293B` | Divisores, bordas de cards |
| **Success** | `#10B981` | Download completo, sucesso |
| **Warning** | `#F59E0B` | Alertas leves |
| **Error** | `#EF4444` | Erros, exclusão |
| **Overlay** | `rgba(10, 14, 26, 0.85)` | Modais, bottom sheets |

### 2.2 Tipografia

| Estilo | Fonte | Tamanho | Peso | Uso |
|--------|-------|---------|------|-----|
| Display | SF Pro Display | 32px | Bold | Título de tela |
| Heading | SF Pro Display | 24px | Semibold | Nome do álbum/artista |
| Title | SF Pro Text | 18px | Semibold | Nome da música |
| Body | SF Pro Text | 16px | Regular | Texto geral |
| Caption | SF Pro Text | 14px | Regular | Metadados secundários |
| Overline | SF Pro Text | 12px | Medium | Labels, timestamps |

### 2.3 Componentes Base

- **Borda radius:** 12px (cards), 24px (modais), 999px (pills/badges)
- **Shadows:** `0 4px 20px rgba(59, 130, 246, 0.15)` (cards elevados)
- **Blur:** `backdrop-filter: blur(20px)` (glassmorphism no player)
- **Animações:** 200ms ease-in-out (padrão), 300ms spring (interações)

---

## 3. Funcionalidades e Tasks

Cada funcionalidade foi decomposta em tasks sequenciais. Execute uma task por vez, na ordem apresentada.

---

### F1: Setup do Projeto e Arquitetura Base

**Descrição:** Configuração inicial do projeto React Native, estrutura de pastas, tema e navegação.

#### Task 1.1 — Inicializar projeto React Native
- [ ] Criar projeto com `npx react-native init MusicPlayer --template react-native-template-typescript`
- [ ] Configurar ESLint + Prettier
- [ ] Configurar paths absolutos (`@components`, `@screens`, `@hooks`)
- [ ] Instalar e configurar Husky + lint-staged

#### Task 1.2 — Configurar tema e design system
- [ ] Criar `theme.ts` com todos os tokens de cor, tipografia, spacing, border-radius
- [ ] Criar componente `ThemeProvider` com Context API
- [ ] Criar hook `useTheme()`
- [ ] Criar componentes base: `Box`, `Text`, `Button`, `IconButton`
- [ ] Testar renderização de componentes base em tela

#### Task 1.3 — Configurar navegação
- [ ] Instalar `@react-navigation/native` + `@react-navigation/bottom-tabs` + `@react-navigation/native-stack`
- [ ] Configurar `NavigationContainer` no `App.tsx`
- [ ] Criar estrutura de navegação:
  - Tab Navigator: Biblioteca, Buscar, Player (expandable), Playlists, Configurações
  - Stack Navigator dentro de cada tab quando necessário
- [ ] Aplicar tema dark na navegação (header, tab bar)

#### Task 1.4 — Configurar estado global
- [ ] Instalar Zustand
- [ ] Criar stores base: `usePlayerStore`, `useLibraryStore`, `useSettingsStore`
- [ ] Definir interfaces TypeScript para cada store

---

### F2: Acesso a Arquivos Locais (iOS)

**Descrição:** Implementar a leitura de arquivos de áudio da memória interna do iPhone.

#### Task 2.1 — Configurar permissões iOS
- [ ] Instalar `react-native-permissions`
- [ ] Adicionar `NSDocumentsFolderUsageDescription` no `Info.plist`
- [ ] Adicionar `NSPhotoLibraryUsageDescription` (se necessário para artwork)
- [ ] Criar utilitário `requestStoragePermission()`
- [ ] Testar fluxo de permissão no simulador e device real

#### Task 2.2 — Implementar scanner de arquivos
- [ ] Instalar `react-native-fs` (RNFS)
- [ ] Criar função `scanMusicFiles()` que:
  - Acessa `RNFS.DocumentDirectoryPath` e `RNFS.LibraryDirectoryPath`
  - Varre subdiretórios recursivamente
  - Filtra por extensões: `.mp3`, `.m4a`, `.flac`, `.wav`, `.aac`, `.ogg`
- [ ] Criar função `getFileMetadata(path)` que extrai:
  - Nome do arquivo
  - Tamanho
  - Data de modificação
  - Duração (usar `react-native-track-player` utilities)
- [ ] Testar scanner com 10+ arquivos de teste

#### Task 2.3 — Extrair metadados ID3
- [ ] Instalar `react-native-id3v2` ou usar `music-metadata-browser` (via metro config)
- [ ] Criar função `extractMetadata(filePath)` que lê:
  - Título
  - Artista
  - Álbum
  - Gênero
  - Ano
  - Número da faixa
  - Artwork (cover image)
- [ ] Criar fallback: se não houver metadados, usar nome do arquivo como título
- [ ] Testar com arquivos que têm/não têm metadados

#### Task 2.4 — Persistir biblioteca localmente
- [ ] Instalar `@react-native-async-storage/async-storage`
- [ ] Criar função `saveLibrary(tracks)` que serializa e salva
- [ ] Criar função `loadLibrary()` que restaura a biblioteca
- [ ] Criar função `addTracksToLibrary(newTracks)` que merge sem duplicatas
- [ ] Implementar hash/ID único por arquivo (baseado no path + modifiedDate)

---

### F3: Player de Áudio e Background Playback

**Descrição:** Implementar o motor de reprodução com suporte a background, lock screen e Control Center.

#### Task 3.1 — Configurar React Native Track Player
- [ ] Instalar `react-native-track-player`
- [ ] Configurar capability no iOS (background mode: audio)
- [ ] Adicionar `audio` em `UIBackgroundModes` no `Info.plist`
- [ ] Inicializar Track Player no app startup
- [ ] Testar se o app continua tocando ao minimizar

#### Task 3.2 — Implementar controles básicos de playback
- [ ] Criar função `playTrack(track)`
- [ ] Criar função `pause()`
- [ ] Criar função `resume()`
- [ ] Criar função `stop()`
- [ ] Criar função `seekTo(position)` (em segundos)
- [ ] Criar função `skipToNext()`
- [ ] Criar função `skipToPrevious()`
- [ ] Testar cada função isoladamente

#### Task 3.3 — Implementar fila de reprodução (Queue)
- [ ] Criar função `setQueue(tracks[])`
- [ ] Criar função `addToQueue(track)`
- [ ] Criar função `removeFromQueue(index)`
- [ ] Criar função `clearQueue()`
- [ ] Criar função `moveQueueItem(fromIndex, toIndex)` (drag & drop)
- [ ] Sincronizar queue com Track Player
- [ ] Testar transição automática entre faixas

#### Task 3.4 — Implementar modos de reprodução
- [ ] Criar estado `repeatMode`: `OFF`, `TRACK`, `QUEUE`
- [ ] Criar estado `shuffleMode`: boolean
- [ ] Implementar lógica de shuffle (embaralhar queue mantendo faixa atual)
- [ ] Implementar lógica de repeat
- [ ] Testar comportamento em cada combinação

#### Task 3.5 — Lock Screen e Control Center
- [ ] Configurar `Capability` do Track Player para:
  - Play, Pause, SkipToNext, SkipToPrevious, SeekTo
- [ ] Exibir artwork no lock screen
- [ ] Exibir título, artista, álbum no lock screen
- [ ] Atualizar progresso no Control Center
- [ ] Testar em device real

---

### F4: Tela de Biblioteca

**Descrição:** Tela principal que exibe todas as músicas organizadas.

#### Task 4.1 — Criar lista de músicas
- [ ] Criar componente `TrackList` (FlatList otimizada)
- [ ] Renderizar item com: artwork (40x40), título, artista, duração
- [ ] Aplicar tema dark nos itens
- [ ] Implementar `keyExtractor` baseado no ID único
- [ ] Testar com 100+ músicas (performance)

#### Task 4.2 — Implementar pull-to-refresh
- [ ] Adicionar `RefreshControl` na FlatList
- [ ] Ao puxar, executar `scanMusicFiles()` + `addTracksToLibrary()`
- [ ] Mostrar indicador de progresso do scan
- [ ] Testar fluxo completo

#### Task 4.3 — Criar seções de organização
- [ ] Criar tabs/segmento na biblioteca: **Todas**, **Artistas**, **Álbuns**, **Gêneros**
- [ ] **Todas:** lista flat ordenada alfabeticamente
- [ ] **Artistas:** SectionList agrupada por artista
- [ ] **Álbuns:** Grid 2 colunas com artwork do álbum
- [ ] **Gêneros:** lista de gêneros com contagem
- [ ] Implementar busca rápida dentro de cada seção

#### Task 4.4 — Ações de long-press no item
- [ ] Criar bottom sheet com opções:
  - Adicionar à fila
  - Adicionar à playlist
  - Favoritar
  - Compartilhar arquivo
  - Ver detalhes (metadados completos)
  - Excluir da biblioteca (não do arquivo)
- [ ] Implementar cada ação

---

### F5: Tela do Player (Now Playing)

**Descrição:** Tela fullscreen do player com artwork, controles e informações.

#### Task 5.1 — Criar layout do player
- [ ] Criar tela `PlayerScreen` (fullscreen modal/stack)
- [ ] Layout:
  - Top: botão down/minimize + botão more (opções)
  - Middle: artwork grande (280x280) com shadow/gradient
  - Info: título (scroll se longo), artista, álbum
  - Progress: slider de tempo + timestamps
  - Controls: shuffle, previous, play/pause, next, repeat
  - Bottom: fila, letras (placeholder), dispositivo (AirPlay)
- [ ] Aplicar glassmorphism no fundo (blur + gradiente azul)

#### Task 5.2 — Implementar slider de progresso
- [ ] Usar `@react-native-community/slider` ou custom slider
- [ ] Sincronizar com `useProgress()` do Track Player
- [ ] Permitir seek arrastando
- [ ] Mostrar tempo atual e total formatados (`mm:ss`)
- [ ] Atualizar em tempo real (a cada 1s)

#### Task 5.3 — Animações e microinterações
- [ ] Animação de play/pause (scale no botão)
- [ ] Animação de artwork (pulse sutil quando tocando)
- [ ] Transição de tela (slide up/down ao abrir/fechar player)
- [ ] Animação de mudança de faixa (crossfade ou slide)
- [ ] Feedback tátil (Haptic Feedback) nos controles

#### Task 5.4 — Mini player (barra flutuante)
- [ ] Criar componente `MiniPlayer` que aparece acima da tab bar
- [ ] Mostrar: artwork pequeno, título, artista, play/pause, next
- [ ] Tap expande para PlayerScreen fullscreen
- [ ] Swipe horizontal pula faixa
- [ ] Swipe down dismiss (esconde mini player)

---

### F6: Playlists e Coleções

**Descrição:** Criar e gerenciar playlists do usuário.

#### Task 6.1 — CRUD de playlists
- [ ] Criar store `usePlaylistStore` (Zustand)
- [ ] Criar função `createPlaylist(name, description?)`
- [ ] Criar função `renamePlaylist(id, newName)`
- [ ] Criar função `deletePlaylist(id)`
- [ ] Persistir playlists no AsyncStorage
- [ ] Criar tela "Playlists" com lista

#### Task 6.2 — Gerenciar faixas nas playlists
- [ ] Criar função `addTrackToPlaylist(playlistId, trackId)`
- [ ] Criar função `removeTrackFromPlaylist(playlistId, trackIndex)`
- [ ] Criar função `reorderPlaylistTracks(playlistId, fromIndex, toIndex)`
- [ ] Implementar drag & drop na lista de faixas da playlist
- [ ] Testar persistência após restart

#### Task 6.3 — Playlists inteligentes (auto)
- [ ] Criar playlist "Favoritas" (auto-populada com tracks favoritadas)
- [ ] Criar playlist "Recentemente Adicionadas" (últimas 50 faixas)
- [ ] Criar playlist "Mais Tocadas" (baseada em playCount)
- [ ] Criar playlist "Nunca Tocadas"
- [ ] Atualizar automaticamente quando necessário

---

### F7: Busca

**Descrição:** Busca global por música, artista, álbum.

#### Task 7.1 — Implementar busca em tempo real
- [ ] Criar tela `SearchScreen` com search bar fixa no topo
- [ ] Implementar debounce (300ms) no input
- [ ] Buscar em: título, artista, álbum, gênero
- [ ] Mostrar resultados agrupados por categoria
- [ ] Highlight do termo buscado nos resultados

#### Task 7.2 — Histórico de busca
- [ ] Salvar últimas 10 buscas no AsyncStorage
- [ ] Mostrar sugestões ao focar o search bar
- [ ] Permitir limpar histórico
- [ ] Permitir remover item individual do histórico

#### Task 7.3 — Filtros e ordenação
- [ ] Adicionar filtros: Artista, Álbum, Música, Gênero
- [ ] Adicionar ordenação: Relevância, Alfabética, Recentemente adicionado
- [ ] Aplicar filtros em conjunto com busca

---

### F8: Favoritos e Sistema de Curtidas

**Descrição:** Permitir favoritar músicas e acessar rapidamente.

#### Task 8.1 — Favoritar/Desfavoritar
- [ ] Adicionar campo `isFavorite: boolean` no modelo Track
- [ ] Criar função `toggleFavorite(trackId)`
- [ ] Adicionar ícone de coração no TrackList item
- [ ] Adicionar ícone de coração no PlayerScreen
- [ ] Animação de "like" (scale + color change)

#### Task 8.2 — Tela de Favoritos
- [ ] Criar seção/tab "Favoritos" na Biblioteca
- [ ] Listar todas as músicas favoritadas
- [ ] Permitir ordenar por: recentemente favoritado, nome, artista
- [ ] Permitir tocar todas (shuffle ou sequencial)

#### Task 8.3 — Estatísticas de reprodução
- [ ] Adicionar campos no Track: `playCount`, `lastPlayedAt`
- [ ] Incrementar `playCount` ao completar 50% da faixa
- [ ] Atualizar `lastPlayedAt` ao iniciar reprodução
- [ ] Criar tela "Estatísticas" com:
  - Músicas mais tocadas (top 50)
  - Artistas mais tocados
  - Tempo total de reprodução
  - Últimas 7 dias

---

### F9: Configurações e Preferências

**Descrição:** Tela de ajustes do app.

#### Task 9.1 — Configurações de playback
- [ ] Crossfade entre faixas (toggle + slider 0-5s)
- [ ] Normalização de volume (toggle)
- [ ] Pular silêncio no início/fim (toggle)
- [ ] Qualidade de buffer (opções: Econômico, Normal, Alta)
- [ ] Testar cada configuração

#### Task 9.2 — Sleep Timer
- [ ] Criar modal/bottom sheet com opções: 5min, 15min, 30min, 45min, 1h, Fim da faixa atual
- [ ] Implementar countdown com `setTimeout`
- [ ] Ao expirar: pausar playback
- [ ] Mostrar indicador ativo no PlayerScreen
- [ ] Permitir cancelar sleep timer

#### Task 9.3 — Gerenciamento de biblioteca
- [ ] Opção "Reescanear biblioteca" (força novo scan completo)
- [ ] Opção "Limpar cache de artwork" (libera espaço)
- [ ] Opção "Excluir músicas não encontradas" (limpa referências quebradas)
- [ ] Mostrar estatísticas: total de músicas, espaço ocupado, duração total

#### Task 9.4 — Sobre e ajuda
- [ ] Versão do app
- [ ] Créditos
- [ ] Tutorial de primeiro uso (onboarding)
- [ ] FAQ: "Como adicionar músicas?" (explica pasta Arquivos do iOS)

---

### F10: Modo Carro (Car Mode)

**Descrição:** Interface simplificada e segura para uso enquanto dirige.

#### Task 10.1 — Criar layout do modo carro
- [ ] Criar tela `CarModeScreen` (landscape + portrait)
- [ ] Layout simplificado:
  - Artwork grande centralizado
  - Título e artista em fonte grande
  - Botões enormes: previous, play/pause, next
  - Botão de fila (lista simplificada)
- [ ] Cores de alto contraste para visibilidade sob sol
- [ ] Desativar sleep do iPhone quando em car mode

#### Task 10.2 — Ativação do modo carro
- [ ] Toggle nas configurações
- [ ] Atalho na tela do player (ícone de carro)
- [ ] Detectar conexão Bluetooth de carro (opcional futuro)
- [ ] Botão "Sair do modo carro" visível

---

### F11: Equalizador e Efeitos de Áudio

**Descrição:** Equalizador gráfico simples.

#### Task 11.1 — Equalizador básico
- [ ] Instalar `react-native-track-player` com suporte a equalizer (se disponível)
- [ ] Ou: criar presets visuais (Flat, Bass Boost, Treble Boost, Vocal, Electronic)
- [ ] Criar interface com 5 bandas: 60Hz, 230Hz, 910Hz, 3.6kHz, 14kHz
- [ ] Sliders verticais com cor azul
- [ ] Presets pré-definidos selecionáveis
- [ ] Aplicar efeito no playback (via Track Player ou processamento nativo)

---

### F12: Importação e Compartilhamento

**Descrição:** Facilitar a adição de novas músicas ao app.

#### Task 12.1 — Document Picker
- [ ] Instalar `@react-native-documents/picker` ou `react-native-document-picker`
- [ ] Criar botão "Importar Músicas" nas configurações
- [ ] Abrir picker para seleção múltipla de arquivos
- [ ] Copiar arquivos selecionados para diretório do app
- [ ] Executar scan nos novos arquivos
- [ ] Mostrar progresso de importação

#### Task 12.2 — Compartilhamento de playlists
- [ ] Criar função `exportPlaylist(playlistId)` que gera JSON
- [ ] Usar `react-native-share` para compartilhar arquivo
- [ ] Criar função `importPlaylist(filePath)` que lê JSON
- [ ] Validar estrutura do JSON importado
- [ ] Merge com biblioteca existente (match por título/artista)

---

### F13: Widget e Atalhos (iOS)

**Descrição:** Integração nativa com iOS.

#### Task 13.1 — Widget de tela inicial (Home Screen Widget)
- [ ] Criar widget iOS nativo (SwiftUI) que mostra:
  - Música atual (título, artista, artwork)
  - Botões de play/pause e next
- [ ] Atualizar widget via App Groups + UserDefaults
- [ ] Configurar App Group no Xcode

#### Task 13.2 — Atalhos Siri (Siri Shortcuts)
- [ ] Criar intents para:
  - "Tocar música aleatória"
  - "Tocar playlist [nome]"
  - "Pausar música"
- [ ] Registrar intents no `Info.plist`
- [ ] Testar via app Atalhos

---

### F14: Otimização e Polish

**Descrição:** Refinamentos finais, performance e testes.

#### Task 14.1 — Otimização de performance
- [ ] Implementar memoização em listas (`React.memo`, `useMemo`)
- [ ] Otimizar artwork (cache em disco, thumbnails 40x40, full 600x600)
- [ ] Virtualização de listas grandes (FlatList com `getItemLayout`)
- [ ] Reduzir re-renders do PlayerScreen (seletores granulares no Zustand)
- [ ] Testar com biblioteca de 1000+ músicas

#### Task 14.2 — Testes
- [ ] Testes unitários: stores, utilitários, parsers
- [ ] Testes de integração: fluxo de scan → biblioteca → playback
- [ ] Testes no device real: background playback, lock screen, AirPlay
- [ ] Teste de stress: trocar faixas rapidamente 50x
- [ ] Teste offline: desligar Wi-Fi, verificar se tudo funciona

#### Task 14.3 — App Store Preparation
- [ ] Criar ícone do app (todas as resoluções iOS)
- [ ] Criar screenshots para App Store (5.5", 6.5", iPad)
- [ ] Escrever descrição do app
- [ ] Configurar `Info.plist` completo
- [ ] Build de release e arquivamento no Xcode
- [ ] TestFlight para beta testers

---

## 4. Estrutura de Pastas

```
src/
├── app/
│   ├── App.tsx                    # Entry point
│   └── navigation/
│       ├── AppNavigator.tsx
│       ├── TabNavigator.tsx
│       └── types.ts
│
├── screens/
│   ├── LibraryScreen.tsx
│   ├── SearchScreen.tsx
│   ├── PlayerScreen.tsx
│   ├── PlaylistsScreen.tsx
│   ├── PlaylistDetailScreen.tsx
│   ├── SettingsScreen.tsx
│   └── CarModeScreen.tsx
│
├── components/
│   ├── player/
│   │   ├── MiniPlayer.tsx
│   │   ├── PlayerControls.tsx
│   │   ├── ProgressSlider.tsx
│   │   └── NowPlayingArtwork.tsx
│   ├── library/
│   │   ├── TrackList.tsx
│   │   ├── TrackItem.tsx
│   │   ├── AlbumGrid.tsx
│   │   ├── ArtistSection.tsx
│   │   └── EmptyState.tsx
│   ├── common/
│   │   ├── Box.tsx
│   │   ├── Text.tsx
│   │   ├── Button.tsx
│   │   ├── IconButton.tsx
│   │   ├── BottomSheet.tsx
│   │   └── SearchBar.tsx
│   └── theme/
│       └── ThemeProvider.tsx
│
├── hooks/
│   ├── useTheme.ts
│   ├── usePlayer.ts
│   ├── useLibrary.ts
│   ├── usePlaybackState.ts
│   └── useProgress.ts
│
├── stores/
│   ├── playerStore.ts
│   ├── libraryStore.ts
│   ├── playlistStore.ts
│   └── settingsStore.ts
│
├── services/
│   ├── player/
│   │   ├── playbackService.ts
│   │   └── queueManager.ts
│   ├── file/
│   │   ├── fileScanner.ts
│   │   ├── metadataExtractor.ts
│   │   └── fileImporter.ts
│   └── storage/
│       ├── asyncStorage.ts
│       └── cacheManager.ts
│
├── utils/
│   ├── formatters.ts            # formatTime, formatSize
│   ├── idGenerator.ts           # Hash único por arquivo
│   └── permissions.ts           # iOS permissions
│
├── types/
│   ├── track.ts
│   ├── playlist.ts
│   ├── album.ts
│   └── artist.ts
│
└── theme/
    ├── colors.ts
    ├── typography.ts
    ├── spacing.ts
    └── index.ts
```

---

## 5. Dependências Principais

```json
{
  "dependencies": {
    "react": "18.2.0",
    "react-native": "0.74.0",
    "@react-navigation/native": "^6.1.0",
    "@react-navigation/bottom-tabs": "^6.5.0",
    "@react-navigation/native-stack": "^6.9.0",
    "react-native-track-player": "^4.0.0",
    "react-native-fs": "^2.20.0",
    "react-native-permissions": "^4.0.0",
    "@react-native-async-storage/async-storage": "^1.21.0",
    "zustand": "^4.4.0",
    "react-native-gesture-handler": "^2.14.0",
    "react-native-reanimated": "^3.6.0",
    "react-native-screens": "^3.29.0",
    "react-native-safe-area-context": "^4.8.0",
    "react-native-vector-icons": "^10.0.0",
    "react-native-share": "^10.0.0",
    "react-native-document-picker": "^9.0.0",
    "@react-native-community/slider": "^4.5.0",
    "react-native-haptic-feedback": "^2.2.0",
    "music-metadata": "^7.14.0",
    "lodash.debounce": "^4.0.8"
  }
}
```

---

## 6. Roadmap de Desenvolvimento (Tasks Sequenciais)

Execute as tasks na ordem abaixo. Cada fase depende da anterior.

| Ordem | Task | Fase | Tempo Est. |
|-------|------|------|------------|
| 1 | Task 1.1 — Inicializar projeto | F1 | 2h |
| 2 | Task 1.2 — Configurar tema e design system | F1 | 4h |
| 3 | Task 1.3 — Configurar navegação | F1 | 3h |
| 4 | Task 1.4 — Configurar estado global | F1 | 2h |
| 5 | Task 2.1 — Configurar permissões iOS | F2 | 2h |
| 6 | Task 2.2 — Implementar scanner de arquivos | F2 | 4h |
| 7 | Task 2.3 — Extrair metadados ID3 | F2 | 4h |
| 8 | Task 2.4 — Persistir biblioteca localmente | F2 | 3h |
| 9 | Task 3.1 — Configurar React Native Track Player | F3 | 3h |
| 10 | Task 3.2 — Implementar controles básicos | F3 | 4h |
| 11 | Task 3.3 — Implementar fila de reprodução | F3 | 4h |
| 12 | Task 3.4 — Implementar modos de reprodução | F3 | 3h |
| 13 | Task 3.5 — Lock Screen e Control Center | F3 | 3h |
| 14 | Task 4.1 — Criar lista de músicas | F4 | 3h |
| 15 | Task 4.2 — Implementar pull-to-refresh | F4 | 2h |
| 16 | Task 4.3 — Criar seções de organização | F4 | 5h |
| 17 | Task 4.4 — Ações de long-press | F4 | 4h |
| 18 | Task 5.1 — Criar layout do player | F5 | 5h |
| 19 | Task 5.2 — Implementar slider de progresso | F5 | 3h |
| 20 | Task 5.3 — Animações e microinterações | F5 | 4h |
| 21 | Task 5.4 — Mini player | F5 | 4h |
| 22 | Task 6.1 — CRUD de playlists | F6 | 3h |
| 23 | Task 6.2 — Gerenciar faixas nas playlists | F6 | 4h |
| 24 | Task 6.3 — Playlists inteligentes | F6 | 3h |
| 25 | Task 7.1 — Implementar busca em tempo real | F7 | 3h |
| 26 | Task 7.2 — Histórico de busca | F7 | 2h |
| 27 | Task 7.3 — Filtros e ordenação | F7 | 2h |
| 28 | Task 8.1 — Favoritar/Desfavoritar | F8 | 2h |
| 29 | Task 8.2 — Tela de Favoritos | F8 | 2h |
| 30 | Task 8.3 — Estatísticas de reprodução | F8 | 3h |
| 31 | Task 9.1 — Configurações de playback | F9 | 3h |
| 32 | Task 9.2 — Sleep Timer | F9 | 2h |
| 33 | Task 9.3 — Gerenciamento de biblioteca | F9 | 2h |
| 34 | Task 9.4 — Sobre e ajuda | F9 | 2h |
| 35 | Task 10.1 — Criar layout do modo carro | F10 | 3h |
| 36 | Task 10.2 — Ativação do modo carro | F10 | 2h |
| 37 | Task 11.1 — Equalizador básico | F11 | 4h |
| 38 | Task 12.1 — Document Picker | F12 | 3h |
| 39 | Task 12.2 — Compartilhamento de playlists | F12 | 3h |
| 40 | Task 13.1 — Widget de tela inicial | F13 | 6h |
| 41 | Task 13.2 — Atalhos Siri | F13 | 4h |
| 42 | Task 14.1 — Otimização de performance | F14 | 4h |
| 43 | Task 14.2 — Testes | F14 | 6h |
| 44 | Task 14.3 — App Store Preparation | F14 | 4h |

**Total estimado:** ~140 horas (~3.5 semanas full-time)

---

## 7. Screenshots de Referência de Layout

### Tela de Biblioteca (Todas as Músicas)
```
┌─────────────────────────────┐
│  Biblioteca          [🔍]   │  ← Header com search
├─────────────────────────────┤
│ [Todas] [Artistas] [Álbuns]│  ← Segmented control
├─────────────────────────────┤
│  ┌────┐ Song Title          │
│  │ 🎵 │ Artist Name    3:45 │  ← Track item
│  └────┘                      │
│  ┌────┐ Another Song        │
│  │ 🎵 │ Another Artist 4:12 │
│  └────┘                      │
│           ...                │
├─────────────────────────────┤
│  ┌────┐ Now Playing...  ▶️  │  ← Mini Player
│  └────┘                    ⏭ │
├─────────────────────────────┤
│  🎵  🔍  🎶  ⚙️             │  ← Tab Bar
└─────────────────────────────┘
```

### Tela do Player (Fullscreen)
```
┌─────────────────────────────┐
│  ↓          •••              │  ← Minimize + Options
│                              │
│     ┌──────────────┐        │
│     │              │        │
│     │   Artwork    │        │  ← 280x280 com shadow
│     │              │        │
│     └──────────────┘        │
│                              │
│  Song Title That Is Long...  │  ← Scroll if overflow
│  Artist Name                 │
│  Album Name                  │
│                              │
│  1:23  ━━━━━●━━━━━━  3:45   │  ← Progress slider
│                              │
│  🔀  ⏮  ⏯  ⏭  🔁           │  ← Controls
│                              │
│  [📝]  [📋]  [📤]           │  ← Lyrics, Queue, Share
└─────────────────────────────┘
```

---

## 8. Notas Técnicas Importantes

### iOS File Access
- O iOS é sandboxed. O app só acessa sua própria pasta de documentos e a pasta compartilhada via "Arquivos" app.
- Para acessar a biblioteca de músicas do iPhone (Apple Music), seria necessário `MPMediaPickerController`, mas isso não é o escopo (o app lê arquivos próprios).
- O usuário deve colocar arquivos .mp3 na pasta do app via iTunes File Sharing, AirDrop para o app, ou Document Picker.

### Background Audio
- Obrigatório adicionar `audio` em `UIBackgroundModes` no `Info.plist`
- Obrigatório configurar `AVAudioSession` com categoria `.playback`
- Track Player faz isso automaticamente, mas verificar configuração

### Formatos Suportados
- iOS nativamente suporta: MP3, AAC, ALAC, WAV, AIFF
- FLAC requer iOS 11+ (suportado nativamente)
- OGG/Opus pode não ser suportado nativamente — testar

### Performance
- Artwork: usar `react-native-fast-image` para cache agressivo
- Listas: sempre usar `FlatList` com `removeClippedSubviews={true}`
- Metadados: extrair em background (thread separada) para não travar UI

---

## 9. Glossário

| Termo | Definição |
|-------|-----------|
| **Track** | Faixa de áudio individual |
| **Queue** | Fila de reprodução — lista ordenada de tracks a tocar |
| **Artwork** | Imagem de capa do álbum |
| **ID3** | Padrão de metadados em arquivos MP3 |
| **Scan** | Processo de varredura do sistema de arquivos para encontrar músicas |
| **Seek** | Movimentar o ponto de reprodução para outro momento da faixa |
| **Crossfade** | Transição suave entre duas faixas |
| **Shuffle** | Reprodução aleatória |
| **Repeat** | Repetição de faixa ou fila |

---

*Documento gerado em 11/08/2026. Última revisão: v1.0*
