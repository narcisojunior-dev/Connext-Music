import { Modal, Pressable, StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { useTheme } from '@/hooks/use-theme';
import { useSettingsStore, type SleepTimerOption } from '@/stores/settings-store';

const OPTIONS: { option: SleepTimerOption; label: string }[] = [
  { option: 5, label: '5 minutos' },
  { option: 15, label: '15 minutos' },
  { option: 30, label: '30 minutos' },
  { option: 45, label: '45 minutos' },
  { option: 60, label: '1 hora' },
  { option: 'endOfTrack', label: 'Fim da faixa atual' },
];

export interface SleepTimerModalProps {
  visible: boolean;
  onClose: () => void;
}

/** Rótulo curto de um timer, para a linha de Ajustes e o player. */
export function sleepTimerLabel(option: SleepTimerOption): string {
  return OPTIONS.find((o) => o.option === option)?.label ?? String(option);
}

/**
 * Escolha do sleep timer.
 *
 * Ativar uma opção fecha o modal na mesma ação: são seis botões mutuamente
 * exclusivos, e pedir um "confirmar" depois da escolha seria um toque a mais
 * para quem já está deitado.
 */
export function SleepTimerModal({ visible, onClose }: SleepTimerModalProps) {
  const theme = useTheme();
  const sleepTimer = useSettingsStore((s) => s.sleepTimer);
  const startSleepTimer = useSettingsStore((s) => s.startSleepTimer);
  const cancelSleepTimer = useSettingsStore((s) => s.cancelSleepTimer);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Fechar">
        {/* O toque de dentro não deve fechar o modal. */}
        <Pressable
          onPress={(e) => e.stopPropagation()}
          style={[
            styles.sheet,
            { backgroundColor: theme.colors.surface, borderRadius: theme.radius.modal },
          ]}
        >
          <Text variant="title">Sleep Timer</Text>
          <Text variant="overline" color="textMuted">
            A música pausa sozinha, com o volume baixando antes.
          </Text>

          <View style={styles.options}>
            {OPTIONS.map(({ option, label }) => {
              const active = sleepTimer?.option === option;
              return (
                <Pressable
                  key={String(option)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  accessibilityLabel={label}
                  onPress={() => {
                    startSleepTimer(option);
                    onClose();
                  }}
                  style={({ pressed }) => [
                    styles.option,
                    {
                      borderRadius: theme.radius.card,
                      backgroundColor: active ? theme.colors.primary : theme.colors.surfaceElevated,
                      opacity: pressed ? 0.7 : 1,
                    },
                  ]}
                >
                  <Text variant="caption" color={active ? 'textPrimary' : 'textSecondary'}>
                    {label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {sleepTimer ? (
            <Button
              title="Cancelar timer"
              variant="ghost"
              onPress={() => {
                cancelSleepTimer();
                onClose();
              }}
            />
          ) : null}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  sheet: {
    padding: 20,
    gap: 10,
  },
  options: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingTop: 4,
  },
  option: {
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
});
