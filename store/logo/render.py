#!/usr/bin/env python3
"""
Rasteriza a marca do Connext Music em PNG com fundo realmente transparente.

Por que não converter o SVG com uma ferramenta pronta: o `qlmanage` do macOS,
que é o único conversor disponível aqui, compõe o SVG sobre **branco**. O PNG
sai com canal alfa, e por isso passa numa checagem ingênua de `hasAlpha`, mas
todos os pixels ficam opacos — foi assim que a splash screen apareceu com um
quadrado branco atrás da marca.

A geometria é a mesma do `marca.svg`, definida uma vez aqui e usada para gerar
os dois. Sem dependências: escreve o PNG na mão, com zlib da biblioteca padrão.

    python3 store/logo/render.py
"""

import math
import struct
import zlib
from pathlib import Path

# ─────────────────────────────────────────────────────────── geometria

CANVAS = 1024
STEM_W = 62  # espessura da haste
RX, RY = 100, 74  # raios da cabeça
TILT = 21  # inclinação da cabeça, como na notação manuscrita
SHIFT_Y = 9.3  # correção de centro óptico

TOP_L = (338.0, 188.0)
HEAD_L = (326.0, 762.0)
TOP_R = (CANVAS - TOP_L[0], TOP_L[1])
HEAD_R = (CANVAS - HEAD_L[0], HEAD_L[1])

# Gradientes na diagonal em que se lê uma partitura.
GRAD_A = ((0.2, 0.05), (0.8, 0.95), (0x8C, 0xBE, 0xFD), (0x25, 0x63, 0xEB))
GRAD_B = ((0.8, 0.05), (0.2, 0.95), (0x60, 0xA5, 0xFA), (0x1D, 0x4E, 0xD8))

SUPERSAMPLE = 3  # 3×3 amostras por pixel — suaviza as diagonais


def stem_quad(a, b, width):
    """Haste com as pontas cortadas perpendicularmente ao próprio eixo."""
    dx, dy = b[0] - a[0], b[1] - a[1]
    n = math.hypot(dx, dy)
    px, py = -dy / n * (width / 2), dx / n * (width / 2)
    return [
        (a[0] + px, a[1] + py),
        (a[0] - px, a[1] - py),
        (b[0] - px, b[1] - py),
        (b[0] + px, b[1] + py),
    ]


def in_quad(x, y, quad):
    """Convexo: o ponto está do mesmo lado de todas as arestas."""
    sign = 0
    for i in range(4):
        x1, y1 = quad[i]
        x2, y2 = quad[(i + 1) % 4]
        cross = (x2 - x1) * (y - y1) - (y2 - y1) * (x - x1)
        if cross != 0:
            s = 1 if cross > 0 else -1
            if sign == 0:
                sign = s
            elif s != sign:
                return False
    return True


def in_ellipse(x, y, cx, cy, rx, ry, angle_deg):
    rad = math.radians(-angle_deg)
    dx, dy = x - cx, y - cy
    ux = dx * math.cos(rad) - dy * math.sin(rad)
    uy = dx * math.sin(rad) + dy * math.cos(rad)
    return (ux / rx) ** 2 + (uy / ry) ** 2 <= 1.0


def gradient_color(x, y, grad):
    (x1, y1), (x2, y2), c0, c1 = grad
    ax, ay = x1 * CANVAS, y1 * CANVAS
    bx, by = x2 * CANVAS, y2 * CANVAS
    vx, vy = bx - ax, by - ay
    t = ((x - ax) * vx + (y - ay) * vy) / (vx * vx + vy * vy)
    t = min(1.0, max(0.0, t))
    return tuple(round(c0[i] + (c1[i] - c0[i]) * t) for i in range(3))


def sample(x, y):
    """Cor da marca no ponto, ou None onde não há tinta.

    A ordem segue o SVG: o grupo B é desenhado depois e vence na sobreposição.
    """
    yy = y - SHIFT_Y

    if in_quad(x, yy, STEM_B) or in_ellipse(x, yy, *HEAD_L, RX, RY, TILT):
        return gradient_color(x, yy, GRAD_B)
    if in_quad(x, yy, STEM_A) or in_ellipse(x, yy, *HEAD_R, RX, RY, -TILT):
        return gradient_color(x, yy, GRAD_A)
    return None


STEM_A = stem_quad(TOP_L, HEAD_R, STEM_W)
STEM_B = stem_quad(TOP_R, HEAD_L, STEM_W)


def render(size, background=None):
    """Devolve os bytes RGBA. `background` None = transparente."""
    scale = CANVAS / size
    step = 1.0 / SUPERSAMPLE
    total = SUPERSAMPLE * SUPERSAMPLE
    rows = []

    for py in range(size):
        row = bytearray()
        for px in range(size):
            r = g = b = 0
            hits = 0
            for sy in range(SUPERSAMPLE):
                for sx in range(SUPERSAMPLE):
                    x = (px + (sx + 0.5) * step) * scale
                    y = (py + (sy + 0.5) * step) * scale
                    c = sample(x, y)
                    if c:
                        r += c[0]
                        g += c[1]
                        b += c[2]
                        hits += 1

            if hits == 0:
                row += bytes(background + (255,)) if background else b"\x00\x00\x00\x00"
                continue

            cov = hits / total
            fr, fg, fb = r // hits, g // hits, b // hits

            if background:
                # Compõe sobre o fundo, mantendo o pixel opaco.
                row += bytes(
                    (
                        round(background[0] + (fr - background[0]) * cov),
                        round(background[1] + (fg - background[1]) * cov),
                        round(background[2] + (fb - background[2]) * cov),
                        255,
                    )
                )
            else:
                # Alfa premultiplicado não: PNG usa alfa direto.
                row += bytes((fr, fg, fb, round(cov * 255)))
        rows.append(bytes(row))

    return rows


def write_png(path, rows, size):
    raw = b"".join(b"\x00" + r for r in rows)  # filtro 0 por linha

    def chunk(tag, data):
        c = struct.pack(">I", len(data)) + tag + data
        return c + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)

    png = b"\x89PNG\r\n\x1a\n"
    png += chunk(b"IHDR", struct.pack(">IIBBBBB", size, size, 8, 6, 0, 0, 0))
    png += chunk(b"IDAT", zlib.compress(raw, 9))
    png += chunk(b"IEND", b"")
    Path(path).write_bytes(png)


BACKGROUND = (0x0A, 0x0E, 0x1A)  # o mesmo fundo do tema do app

if __name__ == "__main__":
    saidas = [
        ("assets/images/icon.png", 1024, BACKGROUND),
        ("assets/images/splash-icon.png", 512, None),
        ("store/logo/marca.png", 512, None),
        ("store/logo/icone.png", 1024, BACKGROUND),
    ]

    root = Path(__file__).resolve().parent.parent.parent
    for rel, size, bg in saidas:
        write_png(root / rel, render(size, bg), size)
        print(f"{rel}  {size}×{size}  {'fundo do tema' if bg else 'transparente'}")
