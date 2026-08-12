/**
 * Helpers de formatação reutilizáveis.
 *
 * Extraídos das telas que tinham versões inline — ter uma só cópia evita
 * inconsistências (ex: uma tela que formata com zero-pad e outra sem).
 */

/** Segundos → `m:ss` (ex: 195 → `3:15`). */
export function formatDuration(seconds: number): string {
  const safe = Number.isFinite(seconds) && seconds > 0 ? seconds : 0;
  const m = Math.floor(safe / 60);
  const s = Math.floor(safe % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

/** Segundos → `Xh Ymin` (para durações totais de álbum/playlist). */
export function formatTotalDuration(seconds: number): string {
  const safe = Number.isFinite(seconds) && seconds > 0 ? seconds : 0;
  const h = Math.floor(safe / 3600);
  const m = Math.floor((safe % 3600) / 60);
  if (h > 0) return `${h}h ${m}min`;
  return `${m}min`;
}

/** Bytes → string legível (ex: 1024 → `1.0 KB`). */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  const mb = kb / 1024;
  return `${mb.toFixed(1)} MB`;
}
