"""Generate the 1800 x 1200 video end card."""

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


WIDTH, HEIGHT = 1800, 1200
HERE = Path(__file__).resolve().parent
BACKGROUND = HERE / "background.png"
OUTPUT = HERE / "endcard-1800x1200.png"

FONT_CANDIDATES = {
    "regular": [
        Path(r"C:\Windows\Fonts\msyh.ttc"),
        Path("/System/Library/Fonts/PingFang.ttc"),
        Path("/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc"),
    ],
    "bold": [
        Path(r"C:\Windows\Fonts\msyhbd.ttc"),
        Path("/System/Library/Fonts/PingFang.ttc"),
        Path("/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc"),
    ],
}


def load_font(size: int, *, bold: bool = False) -> ImageFont.FreeTypeFont:
    kind = "bold" if bold else "regular"
    for path in FONT_CANDIDATES[kind]:
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


def draw_centered_text(
    draw: ImageDraw.ImageDraw,
    y: int,
    text: str,
    text_font: ImageFont.FreeTypeFont,
) -> None:
    x = (WIDTH - text_width(draw, text, text_font)) // 2
    draw.text((x + 2, y + 3), text, font=text_font, fill=(37, 44, 91))
    draw.text((x, y), text, font=text_font, fill=(247, 249, 253))


def draw_globe(draw: ImageDraw.ImageDraw, center_x: int, center_y: int) -> None:
    color = (247, 249, 253)
    draw.ellipse(
        (center_x - 23, center_y - 23, center_x + 23, center_y + 23),
        outline=color,
        width=3,
    )
    draw.ellipse(
        (center_x - 10, center_y - 23, center_x + 10, center_y + 23),
        outline=color,
        width=3,
    )
    draw.line(
        (center_x - 21, center_y, center_x + 21, center_y),
        fill=color,
        width=3,
    )
    draw.arc(
        (center_x - 22, center_y - 12, center_x + 22, center_y + 12),
        180,
        360,
        fill=color,
        width=2,
    )
    draw.arc(
        (center_x - 22, center_y - 12, center_x + 22, center_y + 12),
        0,
        180,
        fill=color,
        width=2,
    )


def draw_website_row(draw: ImageDraw.ImageDraw) -> None:
    label = "网址："
    url = "https://kbd.weihangli.dev/"
    label_font = load_font(36, bold=True)
    url_font = load_font(36)
    label_width = text_width(draw, label, label_font)
    total_width = (
        52
        + 22
        + label_width
        + text_width(draw, url, url_font)
    )
    x = (WIDTH - total_width) // 2
    draw_globe(draw, x + 26, 591)
    text_x = x + 74
    draw.text((text_x, 565), label, font=label_font, fill=(247, 249, 253))
    draw.text(
        (text_x + label_width, 565),
        url,
        font=url_font,
        fill=(247, 249, 253),
    )


def draw_github_row(draw: ImageDraw.ImageDraw) -> None:
    label = "GitHub 仓库："
    url = "https://github.com/Hanggesimida/keyboard-designer"
    label_font = load_font(29, bold=True)
    url_font = load_font(29)
    label_width = text_width(draw, label, label_font)
    x = (
        WIDTH
        - label_width
        - text_width(draw, url, url_font)
    ) // 2
    draw.text((x, 690), label, font=label_font, fill=(247, 249, 253))
    draw.text(
        (x + label_width, 690),
        url,
        font=url_font,
        fill=(247, 249, 253),
    )


def main() -> None:
    image = fit_cover(Image.open(BACKGROUND).convert("RGB")).convert("RGBA")
    veil = Image.new("RGBA", (WIDTH, HEIGHT), (26, 37, 80, 36))
    image = Image.alpha_composite(image, veil)
    draw = ImageDraw.Draw(image)

    draw_centered_text(
        draw,
        370,
        "如果您有什么想法或者建议，请在评论区留言，我每一条都会看",
        load_font(38),
    )
    draw_website_row(draw)
    draw_github_row(draw)

    image.convert("RGB").save(OUTPUT, "PNG", optimize=True)
    print(f"Generated {OUTPUT} ({WIDTH}x{HEIGHT})")


if __name__ == "__main__":
    main()
