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
- Keybed sources use the canonical layout ID: `{layoutId}-contour-keybed.blend`
  (`ansi-60`, `ansi-65`, `ansi-75`, `ansi-75-84`, `ansi-tkl`, `ansi-1800`,
  `ansi-104`, `ansi-108`). `ansi-108-kit` reuses the 108 source.
- Internal roots follow the same ID (`ANSI60_CaseRoot`, `ANSI75_84_CaseRoot`,
  `ANSI_TKL_CaseRoot`, …). Runtime GLBs under `apps/web/public/models/cases/`
  still use historical asset IDs and are mapped in `CASE_MODEL_REGISTRY`.
- Blender's automatic `.blend1` backups are not committed; Git already provides
  file history.
- Remove superseded prototypes once the corresponding final source is verified.

## Video assets

Each video deliverable should keep its inputs, generation code, and generated
output together in one subdirectory.
