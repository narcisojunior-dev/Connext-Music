import { BlurView } from 'expo-blur';
import { GlassView, isLiquidGlassAvailable, type GlassStyle } from 'expo-glass-effect';
import { Platform, StyleSheet, View, type ViewProps } from 'react-native';

/**
 * O Liquid Glass existe neste aparelho?
 *
 * Avaliado uma vez, no carregamento do módulo: é uma checagem de versão do iOS,
 * que não muda enquanto o app roda. Chamá-la a cada render só custaria uma ida
 * à ponte nativa para receber sempre a mesma resposta.
 */
const HAS_LIQUID_GLASS = Platform.OS === 'ios' && isLiquidGlassAvailable();

export interface GlassSurfaceProps extends ViewProps {
  /** `regular` tem mais material; `clear` deixa passar mais do fundo. */
  glassStyle?: GlassStyle;
  /** Reage ao toque com a deformação do vidro. Só vale em superfícies tocáveis. */
  interactive?: boolean;
  /** Cor que tinge o vidro. Ignorada nos fallbacks, que não a suportam. */
  tintColor?: string;
  /** Intensidade do `BlurView` usado quando não há Liquid Glass. */
  fallbackIntensity?: number;
  /** Cor sólida do último recurso, fora do iOS. */
  fallbackColor?: string;
}

/**
 * Superfície translúcida, com o melhor material disponível.
 *
 * Três níveis, do melhor para o pior: **Liquid Glass** (iOS 26+), que refrata o
 * fundo e tem brilho especular nas bordas; **`BlurView`** (iOS anterior), que só
 * borra; e uma cor sólida no Android.
 *
 * A escolha vive aqui e não nas telas porque ela é a mesma em todas, e
 * espalhá-la faria cada tela envelhecer no seu próprio ritmo — bastaria
 * esquecer uma para o app ficar com dois materiais diferentes na mesma tela.
 */
export function GlassSurface({
  glassStyle = 'regular',
  interactive = false,
  tintColor,
  fallbackIntensity = 80,
  fallbackColor = '#161B2E',
  style,
  children,
  ...rest
}: GlassSurfaceProps) {
  if (HAS_LIQUID_GLASS) {
    return (
      <GlassView
        glassEffectStyle={glassStyle}
        isInteractive={interactive}
        tintColor={tintColor}
        // O app é escuro por definição (`userInterfaceStyle: dark`), então não
        // faz sentido deixar o vidro seguir a aparência do sistema.
        colorScheme="dark"
        style={style}
        {...rest}
      >
        {children}
      </GlassView>
    );
  }

  if (Platform.OS === 'ios') {
    return (
      <BlurView
        tint="dark"
        intensity={fallbackIntensity}
        // Sem Liquid Glass nao ha como tingir o material, entao a cor vai
        // atras: sem isso o play/pause perderia o destaque no fallback.
        style={[tintColor ? { backgroundColor: tintColor } : null, style]}
        {...rest}
      >
        {children}
      </BlurView>
    );
  }

  return (
    <View style={[{ backgroundColor: tintColor ?? fallbackColor }, style]} {...rest}>
      {children}
    </View>
  );
}

/** Verdadeiro quando o material de vidro real está disponível. */
export const hasLiquidGlass = HAS_LIQUID_GLASS;

/** Estilo utilitário para superfícies que preenchem o pai. */
export const glassFill = StyleSheet.absoluteFill;
