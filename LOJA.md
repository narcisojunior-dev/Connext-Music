# Material para a App Store

Textos e checklist de submissão. **Nada aqui foi enviado à Apple** — enviar exige a conta de
desenvolvedor e é decisão do dono do app.

---

## Ficha do app

| Campo                     | Valor                            |
| ------------------------- | -------------------------------- |
| Nome                      | Connext Music                    |
| Subtítulo (30 caracteres) | Seu player local, sem conta      |
| Bundle ID                 | `com.narcisojunior.connextmusic` |
| Versão                    | 1.0.0 (build 1)                  |
| Categoria primária        | Música                           |
| Categoria secundária      | Utilitários                      |
| Classificação etária      | 4+                               |
| Preço                     | Gratuito                         |
| Idiomas                   | Português (Brasil), Inglês       |

### Palavras-chave (100 caracteres, separadas por vírgula)

```
mp3,player,offline,flac,local,música,sem internet,tocador,biblioteca,pastas
```

> Sem repetir o nome do app nem a categoria — a Apple já indexa os dois, e repetir desperdiça
> caracteres.

---

## Descrição — Português

**Promocional (170 caracteres)**

```
Toque suas próprias músicas no iPhone. Sem streaming, sem conta, sem internet — só os seus arquivos,
organizados do seu jeito.
```

**Descrição completa**

```
O Connext Music toca os arquivos de música que estão no seu iPhone. Não é streaming: não pede conta,
não pede internet e não sugere o que você deveria ouvir.

COMO FUNCIONA
Traga suas músicas pelo app Arquivos — do iPhone, do iCloud ou do Google Drive — ou arraste do
computador pelo Finder. O app lê as tags, guarda as capas e monta sua biblioteca.

Formatos: MP3, M4A, AAC, FLAC, WAV e OGG.

REPRODUÇÃO
• Continua tocando com a tela bloqueada e o app fechado
• Controles na tela de bloqueio e na Central de Controle
• Fones e AirPods: play/pause e trocar de faixa
• Avanço e retrocesso de 10 segundos
• Fila com aleatório e repetição
• Fade entre faixas e normalização de volume
• Sleep timer, com o som baixando antes de pausar

SUA BIBLIOTECA
• Por artista, álbum, gênero — ou pelas pastas que você mesmo criou
• Busca que ignora acento e encontra por título, artista, álbum ou gênero
• Playlists suas, com reordenação por arrastar
• Listas automáticas: Favoritas, Recentemente Adicionadas, Mais Tocadas, Nunca Tocadas
• Estatísticas do que você ouve

NO DIA A DIA
• Widget na tela de início com a faixa atual
• Atalhos do Siri: tocar aleatória, pausar, tocar uma playlist
• Modo carro: controles grandes, alto contraste e tela sempre acesa
• Compartilhe playlists por arquivo

PRIVACIDADE
O app não coleta nada, não tem anúncios e não faz nenhuma conexão de rede. Sua música e o que você
ouve não saem do aparelho.
```

---

## Descrição — English

**Promotional text (170 characters)**

```
Play your own music on iPhone. No streaming, no account, no internet — just your files, organized
your way.
```

**Full description**

```
Connext Music plays the music files on your iPhone. It is not a streaming app: no account, no
internet, and no suggestions about what you should listen to.

HOW IT WORKS
Bring your music in through the Files app — from your iPhone, iCloud, or Google Drive — or drag it
from your computer in Finder. The app reads the tags, caches the artwork, and builds your library.

Formats: MP3, M4A, AAC, FLAC, WAV, and OGG.

PLAYBACK
• Keeps playing with the screen locked and the app closed
• Lock screen and Control Center controls
• Headphone and AirPods controls
• 10-second skip forward and back
• Queue with shuffle and repeat
• Fade between tracks and volume normalization
• Sleep timer that fades out before pausing

YOUR LIBRARY
• By artist, album, genre — or by the folders you created yourself
• Accent-insensitive search across title, artist, album, and genre
• Your own playlists, reorderable by dragging
• Automatic lists: Favorites, Recently Added, Most Played, Never Played
• Listening statistics

EVERY DAY
• Home screen widget with the current track
• Siri shortcuts: play something random, pause, play a playlist
• Car mode: large controls, high contrast, screen stays awake
• Share playlists as a file

PRIVACY
The app collects nothing, has no ads, and makes no network connections. Your music and your
listening never leave the device.
```

---

## Notas da versão 1.0.0

**Português**

```
Primeira versão.

Toque suas músicas locais com controles na tela de bloqueio, fila, playlists, busca e estatísticas.
Organize por artista, álbum, gênero ou pelas suas próprias pastas. Widget, atalhos do Siri e modo
carro inclusos.
```

**English**

```
First release.

Play your local music with lock screen controls, a queue, playlists, search, and statistics.
Organize by artist, album, genre, or your own folders. Includes a home screen widget, Siri
shortcuts, and car mode.
```

---

## Privacidade (App Privacy)

O questionário da App Store deve ser respondido como **"Data Not Collected"** em todas as
categorias. O app:

- não faz nenhuma requisição de rede;
- não usa analytics, crash reporting ou SDK de terceiros que colete dados;
- guarda tudo em `AsyncStorage` e no sistema de arquivos do próprio app.

O único dado que sai do sandbox é o que o **usuário** compartilha ativamente: um arquivo de playlist
pela folha de compartilhamento do iOS.

### Permissões declaradas

| Permissão                           | Motivo                                                           |
| ----------------------------------- | ---------------------------------------------------------------- |
| `NSDocumentsFolderUsageDescription` | Ler os arquivos de música que o usuário colocou no app           |
| `UIBackgroundModes: audio`          | Continuar tocando com o app em segundo plano                     |
| `UIFileSharingEnabled`              | Receber músicas pelo Finder                                      |
| App Group                           | Compartilhar a faixa atual com o widget e com os atalhos do Siri |

---

## Checklist de submissão

### Pronto

- [x] Ícone 1024×1024 (`assets/images/icon.png`, fonte em `store/logo/icone.svg`)
- [x] Splash screen
- [x] `app.json` completo: nome de exibição, versão, build number, bundle ID, permissões
- [x] `eas.json` com os perfis `development`, `preview` e `production`
- [x] Descrição PT-BR e EN
- [x] Notas da versão
- [x] Onboarding de 3 telas explicando como adicionar músicas

### Falta — precisa da conta Apple

- [ ] `ios.appleTeamId` no `app.json` (o plugin de widgets já avisa que falta)
- [ ] App Group registrado no portal da Apple, senão o widget não instala em aparelho
- [ ] `eas build --platform ios --profile production`
- [ ] `eas submit --platform ios`
- [ ] TestFlight para testadores

### Falta — precisa de julgamento humano

- [ ] **Screenshots.** Há capturas de tela em `store/screenshots/`, tiradas do simulador com uma
      biblioteca sintética. Servem de rascunho, **não** para publicar: os nomes são "Faixa 001" e as
      capas são blocos de cor. Refaça com música real antes de enviar.
- [ ] **Revisar a marca com olhos de designer.** O X de duas semínimas cruzadas está em
      `store/logo/`, com a filosofia de design que o guiou em `FILOSOFIA.md`. A geometria é
      calculada, não estimada, e a forma foi escolhida por teste de redução a 88px — mas nenhuma
      marca deveria ir para a loja sem passar por um par de olhos treinados.
- [ ] Rodar o [roteiro de testes em aparelho](TESTES-APARELHO.md) inteiro.

---

## Comandos

```bash
# Build de produção (exige conta Apple configurada)
eas build --platform ios --profile production

# Enviar para a App Store Connect
eas submit --platform ios --latest
```
