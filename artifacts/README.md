# Artifacts

Source and media artifacts that are not loaded by the web application.

```text
artifacts/
├── blender/
│   └── keybeds/   # Current contour-keybed Blender sources
└── video/
    └── endcard/   # Video end-card source, generator, and output
```

## Blender files

- Keep current, intentional source files as `.blend`.
- Blender's automatic `.blend1` backups are not committed; Git already provides
  file history.
- Remove superseded prototypes once the corresponding final source is verified.

## Video assets

Each video deliverable should keep its inputs, generation code, and generated
output together in one subdirectory.
