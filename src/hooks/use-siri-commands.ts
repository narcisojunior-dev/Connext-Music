import { useCallback, useEffect } from 'react';
import { AppState, Platform, type AppStateStatus } from 'react-native';

import { pause, playQueue } from '@/services/player/queue-manager';
import { publishPlaylists, takePendingCommand } from '@/services/siri/pending-command';
import { useLibraryStore } from '@/stores/library-store';
import { usePlaylistStore } from '@/stores/playlist-store';

/**
 * Executa os comandos deixados pelos atalhos do Siri.
 *
 * O intent roda em Swift e não alcança o Track Player, que vive no JavaScript.
 * Ele deixa o pedido no App Group e traz o app para a frente; este hook é quem
 * lê o pedido e age.
 *
 * A leitura acontece ao montar **e** a cada volta para o primeiro plano: se o
 * app já estava aberto em segundo plano, não há montagem nova — só a transição
 * de estado avisa que algo aconteceu.
 */
export function useSiriCommands() {
  const run = useCallback(() => {
    if (Platform.OS !== 'ios') return;

    const pending = takePendingCommand();
    if (!pending) return;

    const tracks = useLibraryStore.getState().tracks;

    switch (pending.command) {
      case 'pause':
        void pause();
        return;

      case 'playRandom': {
        if (tracks.length === 0) return;
        const index = Math.floor(Math.random() * tracks.length);
        // A fila inteira, começando na sorteada: "tocar uma aleatória" que para
        // depois de uma faixa seria um resultado estranho para o pedido.
        void playQueue(tracks, index);
        return;
      }

      case 'playPlaylist': {
        const playlist = usePlaylistStore
          .getState()
          .playlists.find((p) => p.id === pending.argument);
        if (!playlist) return;

        const byId = new Map(tracks.map((t) => [t.id, t]));
        const queue = playlist.trackIds
          .map((id) => byId.get(id))
          .filter((t): t is NonNullable<typeof t> => !!t);

        if (queue.length > 0) void playQueue(queue, 0);
        return;
      }
    }
  }, []);

  useEffect(() => {
    run();

    const subscription = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state === 'active') run();
    });

    return () => subscription.remove();
  }, [run]);
}

/**
 * Mantém a lista de playlists visível para o Siri.
 *
 * Assina o store em vez de publicar em cada ponto de edição: criar, renomear e
 * excluir acontecem em três telas diferentes, e uma delas acabaria esquecida.
 */
export function useSiriPlaylistSync() {
  useEffect(() => {
    if (Platform.OS !== 'ios') return;

    const publish = () => {
      const { playlists } = usePlaylistStore.getState();
      publishPlaylists(playlists.map((p) => ({ id: p.id, name: p.name })));
    };

    publish();

    return usePlaylistStore.subscribe((state, previous) => {
      if (state.playlists !== previous.playlists) publish();
    });
  }, []);
}
