import { Text, type TextProps } from '@/components/ui/text';
import { splitHighlight } from '@/utils/search';

export interface HighlightedTextProps extends Omit<TextProps, 'children'> {
  text: string;
  /** Termo a destacar. Vazio renderiza o texto sem destaque. */
  query: string;
}

/**
 * Texto com o termo buscado destacado.
 *
 * O destaque usa peso e cor, não fundo colorido: no tema escuro um realce de
 * fundo brigaria com o azul de "faixa tocando agora" na mesma lista.
 */
export function HighlightedText({ text, query, ...rest }: HighlightedTextProps) {
  const parts = splitHighlight(text, query);

  return (
    <Text {...rest}>
      {parts.map((part, index) =>
        part.match ? (
          <Text key={index} {...rest} color="primary" style={{ fontWeight: '700' }}>
            {part.text}
          </Text>
        ) : (
          part.text
        ),
      )}
    </Text>
  );
}
