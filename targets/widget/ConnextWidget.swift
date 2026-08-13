import SwiftUI
import WidgetKit

struct Provider: TimelineProvider {
    func placeholder(in context: Context) -> NowPlayingEntry {
        .placeholder
    }

    func getSnapshot(in context: Context, completion: @escaping (NowPlayingEntry) -> Void) {
        completion(NowPlayingStore.read())
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<NowPlayingEntry>) -> Void) {
        // Uma única entrada, com política `.never`: o conteúdo não muda com o
        // tempo, muda quando o app troca de faixa. É o app que pede a
        // atualização (`WidgetCenter.reloadAllTimelines`), então agendar
        // recargas periódicas aqui só gastaria orçamento de execução à toa.
        completion(Timeline(entries: [NowPlayingStore.read()], policy: .never))
    }
}

/// Capa, ou um bloco com nota musical quando a faixa não tem imagem.
struct Artwork: View {
    let image: Image?
    let size: CGFloat

    var body: some View {
        Group {
            if let image {
                image
                    .resizable()
                    .aspectRatio(contentMode: .fill)
            } else {
                ZStack {
                    Color(.sRGB, red: 0.09, green: 0.11, blue: 0.18, opacity: 1)
                    Image(systemName: "music.note")
                        .font(.system(size: size * 0.32))
                        .foregroundStyle(.white.opacity(0.35))
                }
            }
        }
        .frame(width: size, height: size)
        .clipShape(RoundedRectangle(cornerRadius: size * 0.16, style: .continuous))
    }
}

/// Botão que abre o app numa rota específica.
///
/// **Não controla a reprodução no lugar.** O widget roda em outro processo e
/// não alcança o player do app; um controle de verdade exigiria um `AppIntent`
/// somado a uma ponte para o processo do app, e ela só funcionaria enquanto o
/// app estivesse vivo. Abrir o app é o comportamento honesto: sempre funciona,
/// e o toque leva exatamente ao controle que a pessoa procurava.
struct DeepLinkButton: View {
    let systemName: String
    let url: URL
    let prominent: Bool

    var body: some View {
        Link(destination: url) {
            Image(systemName: systemName)
                .font(.system(size: prominent ? 20 : 16, weight: .semibold))
                .foregroundStyle(.white)
                .frame(width: prominent ? 42 : 34, height: prominent ? 42 : 34)
                .background(
                    Circle().fill(prominent ? Color.accentColor : Color.white.opacity(0.15))
                )
        }
    }
}

struct SmallWidgetView: View {
    let entry: NowPlayingEntry

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Artwork(image: entry.artwork, size: 54)

            Text(entry.title)
                .font(.system(size: 14, weight: .semibold))
                .foregroundStyle(.white)
                .lineLimit(2)

            Text(entry.artist)
                .font(.system(size: 12))
                .foregroundStyle(.white.opacity(0.6))
                .lineLimit(1)

            Spacer(minLength: 0)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        // No tamanho pequeno o widget inteiro é o alvo de toque: não há espaço
        // para botões que ainda dê para acertar.
        .widgetURL(URL(string: "connextmusic://player"))
    }
}

struct MediumWidgetView: View {
    let entry: NowPlayingEntry

    var body: some View {
        HStack(spacing: 14) {
            Artwork(image: entry.artwork, size: 76)

            VStack(alignment: .leading, spacing: 4) {
                Text(entry.title)
                    .font(.system(size: 16, weight: .semibold))
                    .foregroundStyle(.white)
                    .lineLimit(2)

                Text(entry.artist)
                    .font(.system(size: 13))
                    .foregroundStyle(.white.opacity(0.6))
                    .lineLimit(1)

                Spacer(minLength: 6)

                if entry.hasTrack {
                    HStack(spacing: 10) {
                        DeepLinkButton(
                            systemName: "backward.fill",
                            url: URL(string: "connextmusic://widget/previous")!,
                            prominent: false
                        )
                        DeepLinkButton(
                            systemName: entry.isPlaying ? "pause.fill" : "play.fill",
                            url: URL(string: "connextmusic://widget/toggle")!,
                            prominent: true
                        )
                        DeepLinkButton(
                            systemName: "forward.fill",
                            url: URL(string: "connextmusic://widget/next")!,
                            prominent: false
                        )
                    }
                }
            }

            Spacer(minLength: 0)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }
}

struct ConnextWidgetEntryView: View {
    @Environment(\.widgetFamily) var family
    var entry: NowPlayingEntry

    var body: some View {
        Group {
            switch family {
            case .systemSmall:
                SmallWidgetView(entry: entry)
            default:
                MediumWidgetView(entry: entry)
            }
        }
        .containerBackground(for: .widget) {
            Color(.sRGB, red: 0.04, green: 0.055, blue: 0.10, opacity: 1)
        }
    }
}

@main
struct ConnextWidget: Widget {
    let kind = "ConnextWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: Provider()) { entry in
            ConnextWidgetEntryView(entry: entry)
        }
        .configurationDisplayName("Tocando agora")
        .description("Mostra a faixa atual do Connext Music.")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}
