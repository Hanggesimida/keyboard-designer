# Video end card

- `background-1.png` — first source background
- `endcard-1-1800x1200.png` — end card rendered from background 1
- `background-2.png` — second source background
- `endcard-2-1800x1200.png` — end card rendered from background 2
- `generate_endcard.py` — deterministic Pillow renderer for background 2

Regenerate from the repository root:

```bash
python -m pip install Pillow
python artifacts/video/endcard/generate_endcard.py
```
