/**
 * App Group compartilhado entre o app, o widget (Issue #23) e os atalhos do
 * Siri (Issue #24).
 *
 * Modulo folha, sem nenhum import: quem so precisa do identificador — os
 * testes, por exemplo — nao deve arrastar junto `react-native` e
 * `expo-file-system`.
 *
 * Precisa bater com `app.json`, `targets/widget/NowPlayingEntry.swift` e
 * `intents/MusicIntents.swift`.
 */
export const APP_GROUP = 'group.com.narcisojunior.connextmusic';
