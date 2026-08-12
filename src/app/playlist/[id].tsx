import { useLocalSearchParams } from 'expo-router';

import { PlaceholderScreen } from '@/components/ui/placeholder-screen';

export default function PlaylistDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  return (
    <PlaceholderScreen
      title={`Playlist: ${id}`}
      description="Faixas da playlist, com reordenação por arrastar e ações de tocar tudo."
      icon="albums-outline"
      issue="Issue #14"
    />
  );
}
