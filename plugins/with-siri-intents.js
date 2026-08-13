const fs = require('fs');
const path = require('path');

const { withDangerousMod, withXcodeProject, IOSConfig } = require('expo/config-plugins');

/** Pasta com os fontes Swift, versionada na raiz do projeto. */
const SOURCE_DIR = 'intents';

/**
 * Adiciona os App Intents ao alvo **principal** do app.
 *
 * Por que não usar `@bacons/apple-targets`, que já está no projeto: aquele
 * plugin cria *extensões*, e uma extensão roda em outro processo, sem alcance
 * ao Track Player. Além disso, o `AppShortcutsProvider` só faz os atalhos
 * aparecerem sozinhos no app Atalhos quando vive no bundle do app.
 *
 * Os arquivos ficam em `intents/` e são copiados para dentro de `ios/` a cada
 * prebuild — `ios/` é gerado e não versionado, então a fonte da verdade
 * precisa morar fora dele.
 */
const withSiriIntents = (config) => {
  // Copia os fontes para dentro do projeto gerado.
  config = withDangerousMod(config, [
    'ios',
    async (config) => {
      const projectRoot = config.modRequest.projectRoot;
      const platformRoot = config.modRequest.platformProjectRoot;
      const projectName = IOSConfig.XcodeUtils.getProjectName(projectRoot);

      const from = path.join(projectRoot, SOURCE_DIR);
      const to = path.join(platformRoot, projectName, SOURCE_DIR);

      if (!fs.existsSync(from)) {
        throw new Error(
          `[with-siri-intents] pasta "${SOURCE_DIR}/" não encontrada. ` +
            'Ela guarda os fontes Swift dos atalhos e precisa existir na raiz do projeto.',
        );
      }

      fs.mkdirSync(to, { recursive: true });
      for (const file of fs.readdirSync(from)) {
        if (file.endsWith('.swift')) {
          fs.copyFileSync(path.join(from, file), path.join(to, file));
        }
      }

      return config;
    },
  ]);

  // Registra cada arquivo no alvo principal, para o Xcode compilá-los.
  config = withXcodeProject(config, (config) => {
    const projectRoot = config.modRequest.projectRoot;
    const projectName = IOSConfig.XcodeUtils.getProjectName(projectRoot);
    const from = path.join(projectRoot, SOURCE_DIR);

    for (const file of fs.readdirSync(from)) {
      if (!file.endsWith('.swift')) continue;

      const relative = `${projectName}/${SOURCE_DIR}/${file}`;

      // `addBuildSourceFileToGroup` duplica a entrada se chamada duas vezes, e
      // o prebuild pode rodar sobre um projeto já existente sem `--clean`.
      const alreadyLinked = Object.values(config.modResults.hash.project.objects.PBXBuildFile || {})
        .filter((entry) => typeof entry === 'object' && entry?.fileRef_comment)
        .some((entry) => entry.fileRef_comment === file);

      if (alreadyLinked) continue;

      IOSConfig.XcodeUtils.addBuildSourceFileToGroup({
        filepath: relative,
        groupName: `${projectName}/${SOURCE_DIR}`,
        project: config.modResults,
        projectName,
      });
    }

    return config;
  });

  return config;
};

module.exports = withSiriIntents;
