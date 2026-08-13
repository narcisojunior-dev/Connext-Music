import Foundation
import SwiftUI
import WidgetKit

/// App Group compartilhado com o app. Precisa bater com `app.json`.
let appGroupIdentifier = "group.com.narcisojunior.connextmusic"

/// Chave que o app escreve no `UserDefaults` compartilhado.
let nowPlayingKey = "nowPlaying"

/// O que o app publica para o widget.
///
/// É um espelho do estado, não a fonte dele: o widget nunca escreve aqui. Os
/// campos são opcionais porque o arquivo pode ter sido escrito por uma versão
/// mais nova do app — nesse caso é melhor mostrar o que dá do que nada.
struct NowPlayingPayload: Codable {
    var title: String?
    var artist: String?
    /// Caminho da capa **dentro do container do App Group**.
    ///
    /// A capa não pode ficar no sandbox do app: o widget é outro processo e não
    /// consegue ler lá. O app copia a imagem para o container compartilhado e
    /// grava aqui só o nome do arquivo.
    var artworkFile: String?
    var isPlaying: Bool?
}

struct NowPlayingEntry: TimelineEntry {
    let date: Date
    let title: String
    let artist: String
    let isPlaying: Bool
    let artwork: Image?
    /// Falso quando não há nada tocando ou nada foi publicado ainda.
    let hasTrack: Bool

    static var placeholder: NowPlayingEntry {
        NowPlayingEntry(
            date: Date(),
            title: "Nada tocando",
            artist: "Abra o Connext Music",
            isPlaying: false,
            artwork: nil,
            hasTrack: false
        )
    }
}

/// Lê o estado publicado pelo app.
enum NowPlayingStore {
    static func read() -> NowPlayingEntry {
        guard
            let defaults = UserDefaults(suiteName: appGroupIdentifier),
            let data = defaults.data(forKey: nowPlayingKey),
            let payload = try? JSONDecoder().decode(NowPlayingPayload.self, from: data),
            let title = payload.title, !title.isEmpty
        else {
            return .placeholder
        }

        return NowPlayingEntry(
            date: Date(),
            title: title,
            artist: payload.artist ?? "",
            isPlaying: payload.isPlaying ?? false,
            artwork: loadArtwork(payload.artworkFile),
            hasTrack: true
        )
    }

    private static func loadArtwork(_ fileName: String?) -> Image? {
        guard
            let fileName, !fileName.isEmpty,
            let container = FileManager.default.containerURL(
                forSecurityApplicationGroupIdentifier: appGroupIdentifier
            )
        else {
            return nil
        }

        let url = container.appendingPathComponent(fileName)
        guard let image = UIImage(contentsOfFile: url.path) else { return nil }
        return Image(uiImage: image)
    }
}
