import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Box } from '@/components/ui/box';
import { Button } from '@/components/ui/button';
import { IconButton } from '@/components/ui/icon-button';
import { Text } from '@/components/ui/text';
import { useTheme } from '@/hooks/use-theme';
import { colors, spacing, typography, type ColorToken, type TypographyVariant } from '@theme/index';

/**
 * Tela de demonstracao do design system (Issue #2).
 *
 * Serve de verificacao visual dos tokens e componentes base. A Issue #3
 * reestrutura `src/app/` em tabs e substitui esta tela pela Biblioteca.
 */

const COLOR_GROUPS: { title: string; tokens: ColorToken[] }[] = [
  { title: 'Superficies', tokens: ['background', 'surface', 'surfaceElevated', 'border'] },
  { title: 'Marca', tokens: ['primary', 'primaryHover', 'secondary', 'accent'] },
  { title: 'Texto', tokens: ['textPrimary', 'textSecondary', 'textMuted'] },
  { title: 'Estado', tokens: ['success', 'warning', 'error'] },
];

const TYPE_SAMPLES: { variant: TypographyVariant; sample: string }[] = [
  { variant: 'display', sample: 'Display' },
  { variant: 'heading', sample: 'Heading' },
  { variant: 'title', sample: 'Title' },
  { variant: 'body', sample: 'Body' },
  { variant: 'caption', sample: 'Caption' },
  { variant: 'overline', sample: 'Overline' },
];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Box gap="md">
      <Text variant="overline" color="textMuted">
        {title.toUpperCase()}
      </Text>
      {children}
    </Box>
  );
}

function Swatch({ token }: { token: ColorToken }) {
  const theme = useTheme();
  return (
    <Box gap="xs" style={styles.swatch}>
      <View
        style={[
          styles.swatchChip,
          {
            backgroundColor: theme.colors[token],
            borderRadius: theme.radius.card,
            borderColor: theme.colors.border,
          },
        ]}
      />
      <Text variant="overline" color="textSecondary" numberOfLines={1}>
        {token}
      </Text>
      <Text variant="overline" color="textMuted">
        {colors[token]}
      </Text>
    </Box>
  );
}

export default function DesignSystemScreen() {
  const theme = useTheme();
  const [shuffle, setShuffle] = useState(false);
  const [loading, setLoading] = useState(false);

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Box gap="xs">
          <Text variant="display">Design System</Text>
          <Text variant="caption" color="textSecondary">
            Tokens e componentes base do Connext Music
          </Text>
        </Box>

        <Section title="Cores">
          {COLOR_GROUPS.map((group) => (
            <Box key={group.title} gap="sm">
              <Text variant="caption" color="textSecondary">
                {group.title}
              </Text>
              <View style={styles.swatchRow}>
                {group.tokens.map((token) => (
                  <Swatch key={token} token={token} />
                ))}
              </View>
            </Box>
          ))}
        </Section>

        <Section title="Tipografia">
          <Box background="surface" padding="lg" radius="card" gap="sm">
            {TYPE_SAMPLES.map(({ variant, sample }) => (
              <View key={variant} style={styles.typeRow}>
                <Text variant={variant}>{sample}</Text>
                <Text variant="overline" color="textMuted">
                  {typography[variant].fontSize}/{typography[variant].lineHeight}
                </Text>
              </View>
            ))}
          </Box>
        </Section>

        <Section title="Botoes">
          <Box gap="sm">
            <Button title="Primary" fullWidth onPress={() => setLoading((v) => !v)} />
            <Button title="Secondary" variant="secondary" fullWidth />
            <Button title="Ghost" variant="ghost" fullWidth />
            <Button title="Carregando" loading={loading} fullWidth />
            <Button title="Desabilitado" disabled fullWidth />
          </Box>
        </Section>

        <Section title="Icon buttons">
          <Box
            background="surface"
            padding="lg"
            radius="card"
            style={styles.controls}
            gap="md"
            elevated
          >
            <IconButton
              name="shuffle"
              accessibilityLabel="Modo aleatorio"
              size="sm"
              active={shuffle}
              onPress={() => setShuffle((v) => !v)}
            />
            <IconButton name="play-skip-back" accessibilityLabel="Faixa anterior" />
            <IconButton
              name="play"
              accessibilityLabel="Reproduzir"
              size="lg"
              background="primary"
            />
            <IconButton name="play-skip-forward" accessibilityLabel="Proxima faixa" />
            <IconButton name="repeat" accessibilityLabel="Repetir" size="sm" />
          </Box>
        </Section>

        <Section title="Box elevado">
          <Box background="surface" padding="lg" radius="card" gap="xs" elevated>
            <Text variant="title">Card com sombra</Text>
            <Text variant="caption" color="textSecondary">
              Sombra azul de 20px conforme a secao 2.3 do PRD.
            </Text>
          </Box>
          <Box
            background="surfaceElevated"
            borderColor="border"
            padding="lg"
            radius="modal"
            gap="xs"
          >
            <Text variant="title">Superficie elevada</Text>
            <Text variant="caption" color="textSecondary">
              Raio de modal (24px) e borda de 1px.
            </Text>
          </Box>
        </Section>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  content: {
    padding: spacing.xl,
    paddingBottom: spacing.xxxl * 2,
    gap: spacing.xxl,
  },
  swatchRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  swatch: {
    width: 76,
  },
  swatchChip: {
    height: 48,
    borderWidth: 1,
  },
  typeRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});
