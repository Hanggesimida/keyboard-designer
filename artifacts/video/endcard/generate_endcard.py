"""Generate the 1800 x 1200 video end card."""

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


WIDTH, HEIGHT = 1800, 1200
HERE = Path(__file__).resolve().parent
BACKGROUND = HERE / "background-2.png"
OUTPUT = HERE / "endcard-2-1800x1200.png"

FONT_CANDIDATES = [
    Path(r"C:\Windows\Fonts\msyh.ttc"),
    Path("/System/Library/Fonts/PingFang.ttc"),
    Path("/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc"),
]


def load_font(size: int) -> ImageFont.FreeTypeFont:
    for path in FONT_CANDIDATES:
        if path.exists():
            return ImageFont.truetype(str(path), size)
    raise FileNotFoundError("No supported Chinese font was found.")


def fit_cover(image: Image.Image) -> Image.Image:
    scale = max(WIDTH / image.width, HEIGHT / image.height)
    image = image.resize(
        (round(image.width * scale), round(image.height * scale)),
        Image.Resampling.LANCZOS,
    )
    left = (image.width - WIDTH) // 2
    top = (image.height - HEIGHT) // 2
    return image.crop((left, top, left + WIDTH, top + HEIGHT))


def text_width(
    draw: ImageDraw.ImageDraw,
    text: str,
    text_font: ImageFont.FreeTypeFont,
) -> int:
    bounds = draw.textbbox((0, 0), text, font=text_font)
    return bounds[2] - bounds[0]


TEXT_COLOR = (247, 249, 253)


def draw_centered_text(
    draw: ImageDraw.ImageDraw,
    y: int,
    text: str,
    text_font: ImageFont.FreeTypeFont,
) -> None:
    x = (WIDTH - text_width(draw, text, text_font)) // 2
    draw.text((x, y), text, font=text_font, fill=TEXT_COLOR)


def main() -> None:
    image = fit_cover(Image.open(BACKGROUND).convert("RGB")).convert("RGBA")
    veil = Image.new("RGBA", (WIDTH, HEIGHT), (26, 37, 80, 36))
    image = Image.alpha_composite(image, veil)
    draw = ImageDraw.Draw(image)

    draw_centered_text(
        draw,
        430,
        "如果您有什么想法或者建议，请在评论区留言，我每一条都会看",
        load_font(44),
    )
    draw_centered_text(
        draw,
        560,
        "网址：https://kbd.weihangli.dev/",
        load_font(34),
    )
    draw_centered_text(
        draw,
        640,
        "GitHub 仓库：https://github.com/Hanggesimida/keyboard-designer",
        load_font(34),
    )

    image.convert("RGB").save(OUTPUT, "PNG", optimize=True)
    print(f"Generated {OUTPUT} ({WIDTH}x{HEIGHT})")


if __name__ == "__main__":
    main()
