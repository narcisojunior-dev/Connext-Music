# Guia Detalhado — Scanner de Arquivos de Áudio no iOS
## Connext Music Player | Task 2.2

> **Plataforma:** iOS (iPhone)  
> **Stack:** React Native + react-native-fs  
> **Objetivo:** Ler arquivos .mp3, .m4a, .flac, .wav, .aac da memória interna do iPhone

---

## 1. Entendendo o Sistema de Arquivos do iOS

### 1.1 O Sandbox do iOS

O iOS é **extremamente restritivo** com acesso a arquivos. Cada app vive em seu próprio "sandbox" e não pode acessar arquivos de outros apps ou do sistema operacional.

```
┌─────────────────────────────────────────────────────────────┐
│                    iOS FILE SYSTEM                           │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  Seu App (Connext Music Player)                        │  │
│  │                                                        │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌─────────────┐ │  │
│  │  │ Documents/   │  │ Library/     │  │ tmp/        │ │  │
│  │  │ (acessível)  │  │ (acessível)  │  │ (temp)      │ │  │
│  │  └──────────────┘  └──────────────┘  └─────────────┘ │  │
│  │                                                        │  │
│  │  ❌ NÃO pode acessar:                                  │  │
│  │     • Fotos do usuário (sem permissão)                │  │
│  │     • Músicas do Apple Music (bloqueado)              │  │
│  │     • Arquivos de outros apps (sandbox)               │  │
│  │     • Sistema de arquivos raiz (/)                    │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                             │
│  ✅ O usuário PODE colocar arquivos em:                     │
│     • Via iTunes File Sharing (conectando no Mac/PC)      │
│     • Via AirDrop (enviar para o app Connext)             │
│     • Via Document Picker (selecionar de outro app)       │
│     • Via "Arquivos" app (pasta do app visível)           │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 1.2 Pastas Acessíveis pelo App

| Pasta | Path (RNFS) | Uso | Persiste após update? |
|-------|-------------|-----|----------------------|
| **Documents** | `RNFS.DocumentDirectoryPath` | Arquivos do usuário (músicas) | ✅ Sim |
| **Library** | `RNFS.LibraryDirectoryPath` | Dados de suporte (cache, config) | ✅ Sim |
| **Caches** | `RNFS.CachesDirectoryPath` | Cache temporário | ❌ Pode ser limpo |
| **tmp** | `RNFS.TemporaryDirectoryPath` | Arquivos temporários | ❌ Não |
| **MainBundle** | `RNFS.MainBundlePath` | Assets do app (read-only) | ✅ Sim |

**Para o Connext Music Player, usaremos principalmente a pasta `Documents/`.**

---

## 2. Configuração Inicial

### 2.1 Instalar react-native-fs

```bash
npm install react-native-fs
# ou
yarn add react-native-fs

# iOS — linkar (se necessário, RN >= 0.60 faz autolinking)
cd ios && pod install
```

### 2.2 Configurar Info.plist

Adicione as seguintes chaves no `ios/ConnextMusicPlayer/Info.plist`:

```xml
<!-- Permissão para acessar documentos -->
<key>NSDocumentsFolderUsageDescription</key>
<string>Connext precisa acessar seus arquivos de música para reproduzi-los.</string>

<!-- Permissão para acessar biblioteca de mídia (se quiser integrar com Apple Music no futuro) -->
<key>NSAppleMusicUsageDescription</key>
<string>Connext pode acessar sua biblioteca de música.</string>

<!-- Suporte a background audio (já configurado no Track Player, mas verifique) -->
<key>UIBackgroundModes</key>
<array>
  <string>audio</string>
</array>

<!-- Suporte a compartilhamento de arquivos via iTunes -->
<key>UIFileSharingEnabled</key>
<true/>
<key>LSSupportsOpeningDocumentsInPlace</key>
<true/>
```

> **UIFileSharingEnabled = true** é crucial! Isso faz com que a pasta `Documents` do app apareça no iTunes/Finder quando o iPhone é conectado ao computador.

### 2.3 Estrutura Esperada da Pasta Documents

```
Documents/
├── Music/
│   ├── Rock/
│   │   ├── banda_a.mp3
│   │   └── banda_b.m4a
│   ├── Pop/
│   │   └── artista_x.flac
│   └── Singles/
│       └── track_01.wav
├── Downloads/
│   └── podcast_ep1.mp3
└── random_song.aac
```

O scanner deve varrer **toda** a pasta `Documents/` recursivamente, não apenas uma subpasta específica.

---

## 3. Implementação do Scanner

### 3.1 Interface do Track

```typescript
// src/types/track.ts

export interface Track {
  id: string;                    // Hash único (SHA256 do path + modifiedDate)
  url: string;                   // Caminho absoluto do arquivo
  title: string;                 // Título da música
  artist: string;                // Artista
  album: string;                 // Álbum
  genre: string;                 // Gênero
  year: number | null;           // Ano
  trackNumber: number | null;    // Número da faixa
  duration: number;              // Duração em segundos
  artwork: string | null;        // Path da imagem de capa (extraída ou genérica)

  // Metadados do arquivo
  fileName: string;              // Nome do arquivo
  fileSize: number;              // Tamanho em bytes
  extension: string;             // Extensão (.mp3, .flac, etc.)
  modifiedDate: number;          // Timestamp da última modificação

  // Playback
  playCount: number;             // Quantas vezes foi tocada
  lastPlayedAt: number | null;   // Timestamp
  isFavorite: boolean;           // Favoritada?

  // ID3 raw (para debug ou uso avançado)
  rawMetadata?: Record<string, any>;
}
```

### 3.2 Serviço de Scanner

```typescript
// src/services/file/fileScanner.ts

import RNFS from 'react-native-fs';
import { Track } from '@types/track';
import { extractMetadata } from './metadataExtractor';
import { generateTrackId } from '@utils/idGenerator';

// Extensões de áudio suportadas
const SUPPORTED_EXTENSIONS = ['.mp3', '.m4a', '.flac', '.wav', '.aac', '.ogg', '.opus'];

// Tamanho mínimo do arquivo (1KB — evita arquivos corrompidos/vazios)
const MIN_FILE_SIZE = 1024;

/**
 * Verifica se um arquivo é de áudio suportado
 */
function isAudioFile(fileName: string): boolean {
  const ext = fileName.toLowerCase().slice(fileName.lastIndexOf('.'));
  return SUPPORTED_EXTENSIONS.includes(ext);
}

/**
 * Formata bytes para tamanho legível
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Escaneia um diretório recursivamente em busca de arquivos de áudio
 */
export async function scanDirectory(
  dirPath: string,
  onProgress?: (current: number, total: number, fileName: string) => void
): Promise<Track[]> {
  const tracks: Track[] = [];
  let processedCount = 0;

  try {
    // Lista todos os itens do diretório
    const items = await RNFS.readDir(dirPath);

    // Filtra apenas arquivos de áudio e subdiretórios
    const audioFiles = items.filter(item => 
      !item.isDirectory() && isAudioFile(item.name) && item.size > MIN_FILE_SIZE
    );
    const subdirectories = items.filter(item => item.isDirectory());

    const totalFiles = audioFiles.length; // Contagem local desta pasta

    // Processa arquivos de áudio desta pasta
    for (const file of audioFiles) {
      try {
        const track = await processAudioFile(file.path);
        if (track) {
          tracks.push(track);
        }

        processedCount++;
        onProgress?.(processedCount, totalFiles, file.name);

      } catch (error) {
        console.warn(`Erro ao processar ${file.name}:`, error);
        // Continua com o próximo arquivo, não quebra o scan
      }
    }

    // Varre subdiretórios recursivamente
    for (const dir of subdirectories) {
      // Ignora pastas do sistema e cache
      if (shouldSkipDirectory(dir.name)) {
        continue;
      }

      const subTracks = await scanDirectory(dir.path, onProgress);
      tracks.push(...subTracks);
    }

  } catch (error) {
    console.error(`Erro ao ler diretório ${dirPath}:`, error);
  }

  return tracks;
}

/**
 * Decide se deve pular um diretório
 */
function shouldSkipDirectory(dirName: string): boolean {
  const skipList = [
    'node_modules',
    '.git',
    '__MACOSX',
    'Caches',
    'tmp',
    'DerivedData',
    '.DS_Store',
  ];
  return skipList.includes(dirName) || dirName.startsWith('.');
}

/**
 * Processa um único arquivo de áudio
 */
async function processAudioFile(filePath: string): Promise<Track | null> {
  try {
    // Extrai informações básicas do arquivo
    const stat = await RNFS.stat(filePath);
    const fileName = filePath.split('/').pop() || 'unknown';
    const extension = fileName.toLowerCase().slice(fileName.lastIndexOf('.'));

    // Extrai metadados ID3 (título, artista, etc.)
    const metadata = await extractMetadata(filePath);

    // Gera ID único baseado no path + data de modificação
    const id = generateTrackId(filePath, stat.mtime);

    // Tenta extrair artwork (capa do álbum)
    const artwork = await extractArtwork(filePath, id);

    const track: Track = {
      id,
      url: filePath,
      title: metadata.title || cleanFileName(fileName),
      artist: metadata.artist || 'Artista Desconhecido',
      album: metadata.album || 'Álbum Desconhecido',
      genre: metadata.genre || '',
      year: metadata.year || null,
      trackNumber: metadata.trackNumber || null,
      duration: metadata.duration || 0,
      artwork,
      fileName,
      fileSize: stat.size,
      extension,
      modifiedDate: stat.mtime,
      playCount: 0,
      lastPlayedAt: null,
      isFavorite: false,
      rawMetadata: metadata.raw,
    };

    return track;

  } catch (error) {
    console.error(`Erro ao processar arquivo ${filePath}:`, error);
    return null;
  }
}

/**
 * Limpa o nome do arquivo para usar como título fallback
 * Ex: "01 - Nome da Musica.mp3" → "Nome da Musica"
 */
function cleanFileName(fileName: string): string {
  return fileName
    .replace(/\.[^/.]+$/, '')           // Remove extensão
    .replace(/^\d+\s*[-_.]\s*/, '')  // Remove número inicial "01 - "
    .replace(/[_-]/g, ' ')              // Substitui _ e - por espaço
    .trim();
}

/**
 * Extrai artwork (capa) do arquivo de áudio
 * Salva como imagem separada no diretório de cache
 */
async function extractArtwork(filePath: string, trackId: string): Promise<string | null> {
  try {
    // Usar react-native-track-player ou biblioteca nativa para extrair artwork
    // Fallback: gerar placeholder com cor baseada no hash do trackId

    // Diretório de cache para artworks
    const artworkDir = `${RNFS.CachesDirectoryPath}/artworks`;
    await RNFS.mkdir(artworkDir);

    const artworkPath = `${artworkDir}/${trackId}.jpg`;

    // Verifica se já existe artwork extraído
    const exists = await RNFS.exists(artworkPath);
    if (exists) {
      return artworkPath;
    }

    // TODO: Implementar extração real de artwork
    // Por enquanto, retorna null (o app usará placeholder)
    return null;

  } catch {
    return null;
  }
}

/**
 * Função principal — inicia o scan completo
 */
export async function scanMusicLibrary(
  onProgress?: (current: number, total: number, fileName: string) => void,
  onComplete?: (tracks: Track[]) => void
): Promise<Track[]> {
  const startTime = Date.now();

  console.log('🔍 Connext: Iniciando scan da biblioteca...');

  // Diretórios a serem escaneados
  const scanPaths = [
    RNFS.DocumentDirectoryPath,
    // Não escanear Library pois contém dados do app, não música do usuário
    // `${RNFS.DocumentDirectoryPath}/Music`, // Se quiser limitar a uma subpasta
  ];

  const allTracks: Track[] = [];

  for (const path of scanPaths) {
    const tracks = await scanDirectory(path, onProgress);
    allTracks.push(...tracks);
  }

  // Remove duplicatas (mesmo ID)
  const uniqueTracks = removeDuplicates(allTracks);

  // Ordena alfabeticamente por título
  uniqueTracks.sort((a, b) => a.title.localeCompare(b.title));

  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log(`✅ Connext: Scan completo! ${uniqueTracks.length} músicas encontradas em ${duration}s`);

  onComplete?.(uniqueTracks);

  return uniqueTracks;
}

/**
 * Remove tracks duplicadas (mesmo ID)
 */
function removeDuplicates(tracks: Track[]): Track[] {
  const seen = new Set<string>();
  return tracks.filter(track => {
    if (seen.has(track.id)) {
      return false;
    }
    seen.add(track.id);
    return true;
  });
}
```

### 3.3 Gerador de ID Único

```typescript
// src/utils/idGenerator.ts

import * as Crypto from 'expo-crypto'; // ou react-native-crypto

/**
 * Gera um ID único e determinístico para uma track
 * Baseado no caminho do arquivo + data de modificação
 * Isso garante que se o arquivo mudar, o ID muda (detecta atualizações)
 */
export function generateTrackId(filePath: string, modifiedDate: number): string {
  const raw = `${filePath}:${modifiedDate}`;

  // Simples hash SHA-256
  // Se não tiver crypto nativo, use esta função alternativa:
  return simpleHash(raw);
}

/**
 * Hash simples (dJB2) — suficiente para IDs locais
 */
function simpleHash(str: string): string {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) + str.charCodeAt(i);
  }
  return Math.abs(hash).toString(16).padStart(16, '0');
}

/**
 * Alternativa: UUID v4 para novas entidades
 */
export function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}
```

---

## 4. Extração de Metadados (ID3)

### 4.1 Opções de Bibliotecas

| Biblioteca | iOS | Performance | Notas |
|-----------|-----|-------------|-------|
| `music-metadata` | ✅ | Média | Melhor precisão, suporta muitos formatos |
| `react-native-id3v2` | ✅ | Alta | Nativo, mais rápido |
| `react-native-track-player` utils | ✅ | Alta | Já instalado, mas limitado |
| `jsmediatags` | ✅ | Média | Pure JS, fácil de usar |

**Recomendação para Connext:** Usar `music-metadata` via metro config (suporta RN) ou `jsmediatags` como fallback.

### 4.2 Implementação com jsmediatags (Mais Simples)

```typescript
// src/services/file/metadataExtractor.ts

import jsmediatags from 'jsmediatags';
import { TrackMetadata } from '@types/track';

export interface TrackMetadata {
  title: string | null;
  artist: string | null;
  album: string | null;
  genre: string | null;
  year: number | null;
  trackNumber: number | null;
  duration: number;  // Em segundos
  artwork: ArrayBuffer | null;
  raw: Record<string, any>;
}

/**
 * Extrai metadados de um arquivo de áudio
 */
export async function extractMetadata(filePath: string): Promise<TrackMetadata> {
  return new Promise((resolve) => {
    jsmediatags.read(filePath, {
      onSuccess: (tag: any) => {
        const tags = tag.tags;

        resolve({
          title: tags.title || null,
          artist: tags.artist || null,
          album: tags.album || null,
          genre: tags.genre || null,
          year: tags.year ? parseInt(tags.year) : null,
          trackNumber: tags.track ? parseInt(tags.track) : null,
          duration: 0, // jsmediatags não extrai duração, ver abaixo
          artwork: tags.picture?.data || null,
          raw: tags,
        });
      },
      onError: () => {
        // Se falhar, retorna tudo null
        resolve({
          title: null,
          artist: null,
          album: null,
          genre: null,
          year: null,
          trackNumber: null,
          duration: 0,
          artwork: null,
          raw: {},
        });
      }
    });
  });
}
```

### 4.3 Obter Duração do Áudio

`jsmediatags` não extrai duração. Use `react-native-track-player` para isso:

```typescript
// src/services/file/durationExtractor.ts

import TrackPlayer, { Track as TPTrack } from 'react-native-track-player';

/**
 * Obtém a duração de um arquivo de áudio em segundos
 * Usa Track Player para carregar temporariamente e obter duração
 */
export async function getAudioDuration(filePath: string): Promise<number> {
  try {
    // Cria uma track temporária
    const tempTrack: TPTrack = {
      id: 'temp-duration-check',
      url: filePath,
      title: 'temp',
      artist: 'temp',
    };

    // Adiciona à fila
    await TrackPlayer.add(tempTrack);

    // Pula para ela
    await TrackPlayer.skipToNext();

    // Aguarda um pouco para carregar metadados
    await new Promise(resolve => setTimeout(resolve, 500));

    // Obtém duração
    const duration = await TrackPlayer.getDuration();

    // Remove da fila
    await TrackPlayer.removeUpcomingTracks();

    return duration || 0;

  } catch (error) {
    console.warn('Erro ao obter duração:', error);
    return 0;
  }
}
```

> ⚠️ **Nota:** Este método é lento (500ms+ por arquivo). Para o scan inicial, considere:
> 1. Não extrair duração no scan — deixar para quando a música for tocada pela primeira vez
> 2. Ou extrair duração em background após o scan inicial

---

## 5. Integração com a UI (Tela de Biblioteca)

### 5.1 Hook useLibraryScanner

```typescript
// src/hooks/useLibraryScanner.ts

import { useState, useCallback } from 'react';
import { scanMusicLibrary } from '@services/file/fileScanner';
import { useLibraryStore } from '@stores/libraryStore';
import { Track } from '@types/track';

interface ScanState {
  isScanning: boolean;
  progress: number;
  totalFiles: number;
  currentFile: string;
  foundTracks: number;
}

export function useLibraryScanner() {
  const [state, setState] = useState<ScanState>({
    isScanning: false,
    progress: 0,
    totalFiles: 0,
    currentFile: '',
    foundTracks: 0,
  });

  const setLibrary = useLibraryStore(state => state.setLibrary);
  const addTracks = useLibraryStore(state => state.addTracks);

  const scan = useCallback(async (isFullScan = false) => {
    setState(prev => ({ ...prev, isScanning: true, progress: 0 }));

    try {
      let fileCount = 0;

      const tracks = await scanMusicLibrary(
        // onProgress
        (current, total, fileName) => {
          fileCount = total;
          setState(prev => ({
            ...prev,
            progress: total > 0 ? current / total : 0,
            totalFiles: total,
            currentFile: fileName,
          }));
        },
        // onComplete
        (scannedTracks) => {
          setState(prev => ({
            ...prev,
            foundTracks: scannedTracks.length,
            isScanning: false,
            progress: 1,
          }));
        }
      );

      if (isFullScan) {
        setLibrary(tracks);
      } else {
        // Incremental: adiciona apenas novas
        addTracks(tracks);
      }

      return tracks;

    } catch (error) {
      console.error('Erro no scan:', error);
      setState(prev => ({ ...prev, isScanning: false }));
      throw error;
    }
  }, [setLibrary, addTracks]);

  return {
    ...state,
    scan,
  };
}
```

### 5.2 Componente de Scan Progress

```typescript
// src/components/library/ScanProgress.tsx

import React from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { Text } from '@components/common/Text';
import { useTheme } from '@hooks/useTheme';

interface Props {
  progress: number;        // 0 a 1
  totalFiles: number;
  currentFile: string;
  foundTracks: number;
}

export function ScanProgress({ progress, totalFiles, currentFile, foundTracks }: Props) {
  const theme = useTheme();
  const percentage = Math.round(progress * 100);

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.surface }]}>
      <ActivityIndicator color={theme.colors.primary} />

      <Text style={styles.title}>
        Atualizando biblioteca...
      </Text>

      <View style={styles.progressBar}>
        <View 
          style={[
            styles.progressFill, 
            { 
              width: `${percentage}%`,
              backgroundColor: theme.colors.primary 
            }
          ]} 
        />
      </View>

      <Text style={styles.stats}>
        {percentage}% • {foundTracks} músicas encontradas
      </Text>

      {currentFile && (
        <Text style={styles.currentFile} numberOfLines={1}>
          {currentFile}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    borderRadius: 12,
    margin: 16,
    alignItems: 'center',
  },
  title: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: '600',
  },
  progressBar: {
    width: '100%',
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 2,
    marginTop: 12,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  stats: {
    marginTop: 8,
    fontSize: 12,
    opacity: 0.7,
  },
  currentFile: {
    marginTop: 4,
    fontSize: 11,
    opacity: 0.5,
  },
});
```

---

## 6. Fluxo Completo do Scanner

```
┌─────────────────────────────────────────────────────────────┐
│  USUÁRIO ABRE O APP (Connext Music Player)                  │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  1. VERIFICA SE JÁ EXISTE BIBLIOTECA SALVA                 │
│     • AsyncStorage: 'connext_library'                       │
│     • Se existe → carrega instantaneamente                  │
│     • Se não existe → mostra tela vazia + botão "Scan"    │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  2. USUÁRIO PUXA PARA BAIXO (Pull to Refresh)              │
│     OU toca "Reescanear Biblioteca" nas configurações      │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  3. INICIA O SCAN                                          │
│     • Mostra overlay de progresso                          │
│     • Chama scanMusicLibrary()                             │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  4. VARREDURA RECURSIVA                                    │
│     • Acessa RNFS.DocumentDirectoryPath                    │
│     • Lista arquivos (RNFS.readDir)                        │
│     • Filtra por extensão (.mp3, .m4a, .flac...)         │
│     • Ignora arquivos < 1KB                                │
│     • Ignora pastas do sistema (.git, Caches, etc.)      │
│     • Para cada arquivo:                                   │
│       - Extrai metadados ID3                               │
│       - Gera ID único                                      │
│       - Extrai artwork (se houver)                         │
│       - Adiciona à lista                                   │
│     • Varre subdiretórios recursivamente                   │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  5. ATUALIZA PROGRESSO NA UI                               │
│     • Atualiza barra de progresso                          │
│     • Mostra nome do arquivo atual                         │
│     • Mostra contagem de músicas encontradas               │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  6. FINALIZA O SCAN                                        │
│     • Remove duplicatas (mesmo ID)                         │
│     • Ordena alfabeticamente                               │
│     • Salva no AsyncStorage                                 │
│     • Atualiza Zustand store                                │
│     • UI mostra lista de músicas                           │
└─────────────────────────────────────────────────────────────┘
```

---

## 7. Otimizações e Boas Práticas

### 7.1 Performance

| Problema | Solução |
|----------|---------|
| Scan lento com 1000+ arquivos | Extrair metadados em batch (10 em 10) + usar `requestAnimationFrame` para UI |
| UI travada durante scan | Rodar scan em `InteractionManager.runAfterInteractions()` |
| Memória alta com artworks | Salvar artwork em disco (cache), não em memória |
| Duração lenta para extrair | Não extrair duração no scan. Obter sob demanda quando tocar |
| Re-scan desnecessário | Comparar `modifiedDate` dos arquivos com a biblioteca salva |

### 7.2 Scan Incremental (Smart Scan)

```typescript
/**
 * Scan inteligente que só processa arquivos novos ou modificados
 */
export async function incrementalScan(
  existingLibrary: Track[]
): Promise<Track[]> {
  const existingMap = new Map(existingLibrary.map(t => [t.id, t]));
  const newTracks: Track[] = [];

  const scanPaths = [RNFS.DocumentDirectoryPath];

  for (const path of scanPaths) {
    const items = await RNFS.readDir(path);

    for (const item of items) {
      if (item.isDirectory()) {
        // Recursão... (simplificado)
        continue;
      }

      if (!isAudioFile(item.name)) continue;

      const id = generateTrackId(item.path, item.mtime);

      // Se já existe e não foi modificado, pula
      if (existingMap.has(id)) {
        continue;
      }

      // Novo ou modificado — processa
      const track = await processAudioFile(item.path);
      if (track) {
        newTracks.push(track);
      }
    }
  }

  // Merge: existentes + novos
  return [...existingLibrary, ...newTracks];
}
```

### 7.3 Tratamento de Erros

```typescript
// Estratégia de erro robusta
type ScanError = {
  filePath: string;
  error: string;
  type: 'PERMISSION' | 'CORRUPTED' | 'UNKNOWN';
};

// Durante o scan, coletar erros mas não parar
const errors: ScanError[] = [];

try {
  // ... processa arquivo
} catch (error) {
  errors.push({
    filePath: file.path,
    error: error.message,
    type: classifyError(error),
  });
  // CONTINUA com o próximo arquivo!
}

// Ao final, mostrar resumo de erros (se houver)
if (errors.length > 0) {
  console.warn(`${errors.length} arquivos não puderam ser lidos:`);
  errors.forEach(e => console.warn(`  - ${e.filePath}: ${e.error}`));
}
```

---

## 8. Testes do Scanner

### 8.1 Casos de Teste

| # | Cenário | Esperado |
|---|---------|----------|
| 1 | Pasta vazia | Retorna array vazio, não quebra |
| 2 | 1 arquivo .mp3 válido | Retorna 1 track com metadados |
| 3 | 1 arquivo .mp3 corrompido | Ignora arquivo, continua scan |
| 4 | 1000 arquivos mistos | Processa todos, mostra progresso |
| 5 | Arquivos sem metadados ID3 | Usa nome do arquivo como título |
| 6 | Subdiretórios aninhados (5 níveis) | Varre recursivamente todos |
| 7 | Arquivo com artwork embutida | Extrai e salva no cache |
| 8 | Re-scan após adicionar 1 música | Detecta apenas a nova música |
| 9 | Arquivo renomeado | Gera novo ID, detecta como nova |
| 10 | Sem permissão de acesso | Solicita permissão ao usuário |

### 8.2 Script de Teste

```typescript
// __tests__/fileScanner.test.ts

import { scanDirectory, isAudioFile } from '@services/file/fileScanner';

describe('File Scanner', () => {
  test('isAudioFile reconhece extensões suportadas', () => {
    expect(isAudioFile('song.mp3')).toBe(true);
    expect(isAudioFile('song.MP3')).toBe(true);
    expect(isAudioFile('song.flac')).toBe(true);
    expect(isAudioFile('song.txt')).toBe(false);
    expect(isAudioFile('song')).toBe(false);
  });

  test('scanDirectory retorna array vazio para pasta vazia', async () => {
    const tracks = await scanDirectory('/empty/path');
    expect(tracks).toEqual([]);
  });

  // ... mais testes
});
```

---

## 9. Checklist de Implementação

- [ ] Instalar `react-native-fs` e `jsmediatags`
- [ ] Configurar `Info.plist` (UIFileSharingEnabled, NSDocumentsFolderUsageDescription)
- [ ] Rodar `cd ios && pod install`
- [ ] Criar `src/types/track.ts` com interface Track
- [ ] Criar `src/services/file/fileScanner.ts` com função `scanMusicLibrary`
- [ ] Criar `src/utils/idGenerator.ts` com `generateTrackId`
- [ ] Criar `src/services/file/metadataExtractor.ts` com `extractMetadata`
- [ ] Criar hook `useLibraryScanner`
- [ ] Criar componente `ScanProgress`
- [ ] Integrar scanner na tela de Biblioteca (pull-to-refresh)
- [ ] Testar no simulador com arquivos de teste
- [ ] Testar no device real com iTunes File Sharing
- [ ] Testar scan com 100+ arquivos (performance)
- [ ] Implementar scan incremental (não re-processar arquivos existentes)
- [ ] Salvar biblioteca no AsyncStorage
- [ ] Testar reabertura do app (deve carregar biblioteca salva instantaneamente)

---

*Guia gerado para Connext Music Player | Task 2.2*
