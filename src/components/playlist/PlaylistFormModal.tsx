import { useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, StyleSheet, TextInput, View } from 'react-native';

import { Box } from '@/components/ui/box';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { useTheme } from '@/hooks/use-theme';

export interface PlaylistFormModalProps {
  visible: boolean;
  /** Valores atuais ao editar; ausentes ao criar. */
  initialName?: string;
  initialDescription?: string;
  onSubmit: (name: string, description: string) => void;
  onCancel: () => void;
}

/** Modal de criação e edição de playlist. */
export function PlaylistFormModal({
  visible,
  initialName = '',
  initialDescription = '',
  onSubmit,
  onCancel,
}: PlaylistFormModalProps) {
  const theme = useTheme();
  const [name, setName] = useState(initialName);
  const [description, setDescription] = useState(initialDescription);

  // Reabrir o modal precisa mostrar os valores do item atual, não os da última
  // edição — o componente permanece montado entre aberturas.
  //
  // O ajuste acontece durante a renderização, e não num efeito: um efeito
  // renderizaria uma vez com os valores antigos antes de corrigi-los, o que o
  // usuário veria como um piscar. É o padrão que o React documenta para
  // redefinir estado quando uma prop muda.
  const [wasVisible, setWasVisible] = useState(visible);
  if (visible !== wasVisible) {
    setWasVisible(visible);
    if (visible) {
      setName(initialName);
      setDescription(initialDescription);
    }
  }

  const editing = initialName.length > 0;
  const canSubmit = name.trim().length > 0;

  const inputStyle = [
    styles.input,
    theme.typography.body,
    {
      color: theme.colors.textPrimary,
      backgroundColor: theme.colors.surfaceElevated,
      borderRadius: theme.radius.card,
    },
  ];

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={[styles.backdrop, { backgroundColor: theme.colors.overlay }]}
      >
        <Box background="surface" padding="xl" radius="modal" gap="lg" style={styles.card}>
          <Text variant="heading">{editing ? 'Editar playlist' : 'Nova playlist'}</Text>

          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Nome"
            placeholderTextColor={theme.colors.textMuted}
            style={inputStyle}
            autoFocus
            accessibilityLabel="Nome da playlist"
          />
          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder="Descrição (opcional)"
            placeholderTextColor={theme.colors.textMuted}
            style={inputStyle}
            accessibilityLabel="Descrição da playlist"
          />

          <View style={styles.actions}>
            <Button title="Cancelar" variant="ghost" onPress={onCancel} />
            <Button
              title={editing ? 'Salvar' : 'Criar'}
              disabled={!canSubmit}
              onPress={() => onSubmit(name.trim(), description.trim())}
            />
          </View>
        </Box>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  card: {
    width: '100%',
  },
  input: {
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
});
