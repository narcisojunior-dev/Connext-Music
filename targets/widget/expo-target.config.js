/** @type {import('@bacons/apple-targets/app.plugin').ConfigFunction} */
module.exports = (config) => ({
  type: 'widget',
  name: 'ConnextWidget',
  displayName: 'Connext Music',

  // Mesmo App Group do app: e por ele que o widget le a faixa atual. Sem isto
  // os dois processos nao compartilham nada, e o widget nao teria o que mostrar.
  entitlements: {
    'com.apple.security.application-groups':
      config.ios.entitlements['com.apple.security.application-groups'],
  },

  colors: {
    $accent: { color: '#3B82F6', darkColor: '#3B82F6' },
    $widgetBackground: { color: '#0A0E1A', darkColor: '#0A0E1A' },
  },

  frameworks: ['SwiftUI', 'WidgetKit'],

  // 17.0 e o piso do WidgetKit com botoes interativos (AppIntent). Abaixo
  // disso o widget so poderia abrir o app.
  deploymentTarget: '17.0',
});
