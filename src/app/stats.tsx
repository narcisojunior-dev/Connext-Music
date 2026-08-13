import { Ionicons } from '@expo/vector-icons';
import { useMemo } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { EmptyState } from '@/components/ui/empty-state';
import { Text } from '@/components/ui/text';
import { useTheme } from '@/hooks/use-theme';
import { useLibraryStore } from '@/stores/library-store';
import { computeStats, formatListeningTime, type DayStat } from '@/utils/stats';

/** Quantas linhas cada ranking mostra nesta tela — o resto vive nas playlists. */
const VISIBLE_ROWS = 10;

/** Altura máxima de uma barra do gráfico semanal, em pixels. */
const CHART_HEIGHT = 88;

function SummaryCard({ label, value }: { label: string; value: string }) {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.card,
        { backgroundColor: theme.colors.surface, borderRadius: theme.radius.card },
      ]}
    >
      <Text variant="title">{value}</Text>
      <Text variant="overline" color="textMuted">
        {label}
      </Text>
    </View>
  );
}

function WeekChart({ days }: { days: DayStat[] }) {
  const theme = useTheme();
  // Escala relativa ao maior dia. Com `max` fixo, uma semana de 2 reproduções
  // apareceria como um gráfico vazio.
  const max = Math.max(...days.map((d) => d.plays), 1);

  return (
    <View style={styles.chart}>
      {days.map((day) => (
        <View key={day.date} style={styles.chartColumn}>
          <Text variant="overline" color="textMuted">
            {day.plays > 0 ? day.plays : ''}
          </Text>
          <View
            accessibilityRole="image"
            accessibilityLabel={`${day.label}: ${day.plays} faixas`}
            style={[
              styles.bar,
              {
                // Um fio de 2px marca o dia sem nenhuma reprodução; barra de
                // altura zero seria indistinguível de um dia ausente.
                height: day.plays === 0 ? 2 : Math.max(4, (day.plays / max) * CHART_HEIGHT),
                backgroundColor: day.plays === 0 ? theme.colors.border : theme.colors.primary,
                borderRadius: theme.radius.card,
              },
            ]}
          />
          <Text variant="overline" color="textMuted">
            {day.label}
          </Text>
        </View>
      ))}
    </View>
  );
}

function Section({
  title,
  note,
  children,
}: {
  title: string;
  note?: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <Text variant="title">{title}</Text>
      {note ? (
        <Text variant="overline" color="textMuted">
          {note}
        </Text>
      ) : null}
      {children}
    </View>
  );
}

export default function StatsScreen() {
  const theme = useTheme();
  const tracks = useLibraryStore((s) => s.tracks);

  // A biblioteca inteira é percorrida algumas vezes aqui; memorizar evita
  // refazer isso a cada reprodução, que atualiza `tracks`.
  const stats = useMemo(() => computeStats(tracks), [tracks]);

  if (tracks.length === 0) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
        <EmptyState
          icon="stats-chart-outline"
          title="Sem números ainda"
          description="Escaneie a biblioteca e ouça algumas faixas. Os números aparecem aqui."
        />
      </View>
    );
  }

  return (
    <ScrollView
      style={{ backgroundColor: theme.colors.background }}
      contentContainerStyle={styles.content}
    >
      <View style={styles.cards}>
        <SummaryCard label="REPRODUÇÕES" value={String(stats.totalPlays)} />
        <SummaryCard label="TEMPO OUVIDO" value={formatListeningTime(stats.estimatedSeconds)} />
        <SummaryCard label="FAIXAS OUVIDAS" value={`${stats.playedTracks}/${stats.totalTracks}`} />
      </View>

      <Section
        title="Últimos 7 dias"
        note="Conta em que dia cada faixa foi ouvida pela última vez."
      >
        <WeekChart days={stats.lastWeek} />
      </Section>

      <Section title="Mais tocadas">
        {stats.topTracks.length === 0 ? (
          <Text variant="caption" color="textMuted">
            Nenhuma faixa passou de metade ainda.
          </Text>
        ) : (
          stats.topTracks.slice(0, VISIBLE_ROWS).map((track, i) => (
            <View key={track.id} style={styles.row}>
              <Text variant="caption" color="textMuted" style={styles.rank}>
                {i + 1}
              </Text>
              <View style={styles.rowText}>
                <Text variant="caption" numberOfLines={1}>
                  {track.title}
                </Text>
                <Text variant="overline" color="textSecondary" numberOfLines={1}>
                  {track.artist}
                </Text>
              </View>
              <Text variant="caption" color="textMuted">
                {track.playCount}×
              </Text>
            </View>
          ))
        )}
      </Section>

      <Section title="Mais ouvidos">
        {stats.topArtists.length === 0 ? (
          <Text variant="caption" color="textMuted">
            Sem dados de artista ainda.
          </Text>
        ) : (
          stats.topArtists.slice(0, VISIBLE_ROWS).map((artist, i) => (
            <View key={artist.artist} style={styles.row}>
              <Text variant="caption" color="textMuted" style={styles.rank}>
                {i + 1}
              </Text>
              <View style={styles.rowText}>
                <Text variant="caption" numberOfLines={1}>
                  {artist.artist}
                </Text>
                <Text variant="overline" color="textSecondary">
                  {formatListeningTime(artist.seconds)}
                </Text>
              </View>
              <Text variant="caption" color="textMuted">
                {artist.plays}×
              </Text>
            </View>
          ))
        )}
      </Section>

      <View style={styles.footnote}>
        <Ionicons name="information-circle-outline" size={14} color={theme.colors.textMuted} />
        <Text variant="overline" color="textMuted" style={styles.footnoteText}>
          Uma reprodução conta quando a faixa passa de 50%. O tempo ouvido é estimado a partir da
          duração de cada faixa.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 16,
    gap: 28,
    paddingBottom: 120,
  },
  cards: {
    flexDirection: 'row',
    gap: 8,
  },
  card: {
    flex: 1,
    padding: 12,
    gap: 4,
  },
  section: {
    gap: 10,
  },
  chart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 6,
  },
  chartColumn: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  bar: {
    width: '70%',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  rank: {
    width: 20,
    textAlign: 'right',
  },
  rowText: {
    flex: 1,
    gap: 1,
  },
  footnote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
  },
  footnoteText: {
    flex: 1,
  },
});
