// Entry point do app.
//
// O servico de playback precisa ser registrado aqui, e nao dentro de um
// componente: o Track Player o executa fora da arvore do React — inclusive com
// o app em segundo plano — entao ele tem de existir antes de qualquer tela
// montar.
import TrackPlayer from 'react-native-track-player';

import { playbackService } from './src/services/player/playback-service';

TrackPlayer.registerPlaybackService(() => playbackService);

import 'expo-router/entry';
