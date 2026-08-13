import AppIntents
import Foundation

/// Mesmo App Group do widget. Precisa bater com `app.json`.
private let appGroup = "group.com.narcisojunior.connextmusic"

/// Chave onde o intent deixa o comando para o app executar.
private let pendingCommandKey = "pendingCommand"

/// Chave onde o app publica as playlists, para o Siri poder oferecê-las.
private let playlistsKey = "playlists"

/// Grava o comando pedido pelo Siri.
///
/// O intent **não** toca a música por conta própria. Ele roda em Swift, e quem
/// controla a reprodução é o Track Player, do lado JavaScript — não há como
/// chamá-lo daqui. Então o comando é deixado no App Group e o app o executa ao
/// abrir, o que acontece logo em seguida porque todos os intents daqui usam
/// `openAppWhenRun`.
private func queueCommand(_ command: String, argument: String? = nil) {
    guard let defaults = UserDefaults(suiteName: appGroup) else { return }

    var payload: [String: Any] = [
        "command": command,
        // O app ignora comandos velhos: sem isto, um atalho disparado e
        // cancelado tocaria música na próxima vez que o app fosse aberto.
        "requestedAt": Date().timeIntervalSince1970 * 1000,
    ]
    if let argument {
        payload["argument"] = argument
    }

    if let data = try? JSONSerialization.data(withJSONObject: payload) {
        defaults.set(data, forKey: pendingCommandKey)
    }
}

// MARK: - Tocar música aleatória

struct PlayRandomIntent: AppIntent {
    static var title: LocalizedStringResource = "Tocar música aleatória"
    static var description = IntentDescription("Toca uma faixa qualquer da sua biblioteca.")

    /// Traz o app para a frente. Sem isto o intent rodaria sem que ninguém
    /// executasse o comando deixado no App Group.
    static var openAppWhenRun: Bool = true

    func perform() async throws -> some IntentResult {
        queueCommand("playRandom")
        return .result()
    }
}

// MARK: - Pausar

struct PausePlaybackIntent: AppIntent {
    static var title: LocalizedStringResource = "Pausar música"
    static var description = IntentDescription("Pausa o que estiver tocando no Connext Music.")

    static var openAppWhenRun: Bool = true

    func perform() async throws -> some IntentResult {
        queueCommand("pause")
        return .result()
    }
}

// MARK: - Tocar uma playlist

/// Uma playlist, do ponto de vista do Siri.
struct PlaylistEntity: AppEntity {
    let id: String
    let name: String

    static var typeDisplayRepresentation: TypeDisplayRepresentation = "Playlist"
    static var defaultQuery = PlaylistQuery()

    var displayRepresentation: DisplayRepresentation {
        DisplayRepresentation(title: "\(name)")
    }
}

/// Lê as playlists publicadas pelo app no App Group.
///
/// O Siri precisa saber os nomes **antes** de o app abrir — é assim que ele
/// completa "toca playlist Corrida". Por isso o app publica a lista sempre que
/// ela muda, em vez de o intent perguntar na hora.
struct PlaylistQuery: EntityQuery {
    private func all() -> [PlaylistEntity] {
        guard
            let defaults = UserDefaults(suiteName: appGroup),
            let data = defaults.data(forKey: playlistsKey),
            let raw = try? JSONSerialization.jsonObject(with: data) as? [[String: Any]]
        else {
            return []
        }

        return raw.compactMap { item in
            guard let id = item["id"] as? String, let name = item["name"] as? String else {
                return nil
            }
            return PlaylistEntity(id: id, name: name)
        }
    }

    func entities(for identifiers: [String]) async throws -> [PlaylistEntity] {
        all().filter { identifiers.contains($0.id) }
    }

    func suggestedEntities() async throws -> [PlaylistEntity] {
        all()
    }
}

struct PlayPlaylistIntent: AppIntent {
    static var title: LocalizedStringResource = "Tocar playlist"
    static var description = IntentDescription("Toca uma playlist do Connext Music.")

    static var openAppWhenRun: Bool = true

    @Parameter(title: "Playlist")
    var playlist: PlaylistEntity

    static var parameterSummary: some ParameterSummary {
        Summary("Tocar a playlist \(\.$playlist)")
    }

    func perform() async throws -> some IntentResult {
        queueCommand("playPlaylist", argument: playlist.id)
        return .result()
    }
}

// MARK: - Registro

/// O que aparece sozinho no app Atalhos.
///
/// As frases precisam conter `.applicationName`; é o que permite ao Siri
/// distinguir "toca uma aleatória" deste app da mesma frase dita para outro.
struct ConnextShortcuts: AppShortcutsProvider {
    static var appShortcuts: [AppShortcut] {
        AppShortcut(
            intent: PlayRandomIntent(),
            phrases: [
                "Tocar música aleatória no \(.applicationName)",
                "Tocar uma aleatória no \(.applicationName)",
            ],
            shortTitle: "Música aleatória",
            systemImageName: "shuffle"
        )

        AppShortcut(
            intent: PausePlaybackIntent(),
            phrases: [
                "Pausar música no \(.applicationName)",
                "Pausar o \(.applicationName)",
            ],
            shortTitle: "Pausar",
            systemImageName: "pause.fill"
        )

        AppShortcut(
            intent: PlayPlaylistIntent(),
            phrases: [
                "Tocar playlist no \(.applicationName)",
                "Tocar uma playlist no \(.applicationName)",
            ],
            shortTitle: "Tocar playlist",
            systemImageName: "music.note.list"
        )
    }
}
