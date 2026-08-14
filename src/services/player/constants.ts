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
 * Vale só dentro do app: a tela de bloqueio e o Control Center mostram faixa
 * anterior/próxima, não os saltos.
 */
export const JUMP_SECONDS = 10;
