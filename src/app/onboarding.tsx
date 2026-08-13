import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { FlatList, StyleSheet, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { useContentBottomInset } from '@/hooks/use-content-inset';
import { useMusicImport } from '@/hooks/use-music-import';
import { useTheme } from '@/hooks/use-theme';
import { markOnboardingSeen } from '@/services/storage/onboarding-storage';

interface Slide {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  body: string;
}

/**
 * As três telas.
 *
 * O tema é sempre o mesmo — **como colocar música no app** — porque é o único
 * ponto em que um player local pode frustrar alguém logo na primeira abertura:
 * a biblioteca começa vazia e não há um catálogo para explorar. Nada aqui fala
 * de recurso; tudo responde à pergunta "e agora?".
 */
const SLIDES: Slide[] = [
  {
    icon: 'musical-notes',
    title: 'Sua música, no seu aparelho',
    body: 'O Connext Music toca os arquivos que estão no seu iPhone. Não tem streaming, não tem conta e funciona sem internet — inclusive em modo avião.',
  },
  {
    icon: 'download-outline',
    title: 'Traga suas músicas',
    body: 'Toque em “Importar músicas” e escolha os arquivos pelo app Arquivos — do iPhone, do iCloud ou do Google Drive. Eles são copiados para o app.',
  },
  {
    icon: 'laptop-outline',
    title: 'Ou pelo computador',
    body: 'Conecte o iPhone, abra o dispositivo no Finder e arraste as músicas para o Connext Music na aba Arquivos. Aceita MP3, M4A, AAC, FLAC, WAV e OGG.',
  },
];

/**
 * Primeira execução.
 *
 * Aparece uma vez só e some para sempre depois de concluída — quem já sabe
 * como adicionar música não precisa reler. A rota continua acessível por
 * Ajustes para quem quiser rever.
 */
export default function OnboardingScreen() {
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const bottomInset = useContentBottomInset();
  const { importFiles } = useMusicImport();

  const listRef = useRef<FlatList<Slide>>(null);
  const [index, setIndex] = useState(0);

  const isLast = index === SLIDES.length - 1;

  const finish = useCallback(() => {
    void markOnboardingSeen();
    router.replace('/');
  }, []);

  const next = useCallback(() => {
    if (isLast) {
      finish();
      return;
    }
    listRef.current?.scrollToIndex({ index: index + 1, animated: true });
  }, [index, isLast, finish]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <FlatList
        ref={listRef}
        data={SLIDES}
        keyExtractor={(slide) => slide.title}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        // Sem isto, um deslize rápido deixa o indicador fora de sincronia com
        // a página realmente visível.
        onMomentumScrollEnd={(e) =>
          setIndex(Math.round(e.nativeEvent.contentOffset.x / Math.max(1, width)))
        }
        renderItem={({ item }) => (
          <View style={[styles.slide, { width }]}>
            <View style={[styles.iconCircle, { backgroundColor: theme.colors.surface }]}>
              <Ionicons name={item.icon} size={56} color={theme.colors.primary} />
            </View>
            <Text variant="heading" style={styles.center}>
              {item.title}
            </Text>
            <Text variant="body" color="textSecondary" style={styles.center}>
              {item.body}
            </Text>
          </View>
        )}
      />

      <View style={styles.dots}>
        {SLIDES.map((slide, i) => (
          <View
            key={slide.title}
            style={[
              styles.dot,
              {
                backgroundColor: i === index ? theme.colors.primary : theme.colors.surfaceElevated,
                width: i === index ? 22 : 8,
              },
            ]}
          />
        ))}
      </View>

      <View style={[styles.actions, { paddingBottom: bottomInset || 16 }]}>
        {isLast ? (
          <Button
            title="Importar músicas agora"
            onPress={() => {
              // Marca como visto antes de abrir o seletor: quem chegou até
              // aqui já leu, e o seletor é uma tela do sistema por cima.
              void markOnboardingSeen();
              void importFiles();
              router.replace('/');
            }}
          />
        ) : null}

        <Button
          title={isLast ? 'Começar' : 'Continuar'}
          variant={isLast ? 'secondary' : 'primary'}
          onPress={next}
        />

        {!isLast ? <Button title="Pular" variant="ghost" onPress={finish} /> : null}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  slide: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
    paddingHorizontal: 32,
  },
  iconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: {
    textAlign: 'center',
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 20,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  actions: {
    paddingHorizontal: 24,
    gap: 8,
  },
});
