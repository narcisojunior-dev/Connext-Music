import * as Haptics from 'expo-haptics';

/**
 * Retorno tátil por **intenção**, não por intensidade.
 *
 * A intensidade fica declarada num lugar só: espalhada pelos componentes, cada
 * tela acabava escolhendo a sua e o app respondia diferente para ações
 * equivalentes. A escala segue a Issue #16 — leve para controle de transporte,
 * média para uma ação com consequência, forte para abrir um menu.
 *
 * Nunca lança: um aparelho sem Taptic Engine (ou o simulador) apenas ignora.
 */
function impact(style: Haptics.ImpactFeedbackStyle): void {
  Haptics.impactAsync(style).catch(() => {});
}

/** Play/pause, próxima, anterior, saltos, arrastar o slider. */
export function hapticControl(): void {
  impact(Haptics.ImpactFeedbackStyle.Light);
}

/** Favoritar — uma ação que muda dados, não só a reprodução. */
export function hapticCommit(): void {
  impact(Haptics.ImpactFeedbackStyle.Medium);
}

/** Toque longo que abre um menu. Mais forte porque antecede algo aparecendo. */
export function hapticLongPress(): void {
  impact(Haptics.ImpactFeedbackStyle.Heavy);
}
