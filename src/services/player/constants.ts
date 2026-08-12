/**
 * Constantes do player que não dependem do Track Player.
 *
 * Módulo folha de propósito: `playback-service` e `queue-manager` importam
 * daqui sem criar ciclo entre si, e os testes conseguem lê-las sem arrastar o
 * módulo nativo junto.
 */

/**
 * Quantos segundos os botões de avançar/retroceder deslocam.
 *
 * O mesmo valor alimenta `forwardJumpInterval`/`backwardJumpInterval` do Track
 * Player. Se divergirem, o botão do Control Center saltaria diferente do botão
 * da tela — e o usuário não teria como saber qual está certo.
 */
export const JUMP_SECONDS = 10;
