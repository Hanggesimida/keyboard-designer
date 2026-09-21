import { siteConfig } from "@/lib/site"
import { LAYOUT_REGISTRY } from "@/modules/design/data/layouts"
import { CASE_MODEL_REGISTRY } from "@/modules/design/lib/preview3d/caseModelContract"
import { KEYCAP_MODEL_PATHS_BY_PROFILE } from "@/modules/design/lib/preview3d/modelContract"

const REPOSITORY_BRANCH = "main"
const PUBLIC_MODELS_REPOSITORY_ROOT = "apps/web/public"

function encodeRepositoryPath(path: string): string {
  return path.split("/").map(encodeURIComponent).join("/")
}

export function githubBlobUrl(repositoryPath: string): string {
  return `${siteConfig.githubRepo}/blob/${REPOSITORY_BRANCH}/${encodeRepositoryPath(repositoryPath)}`
}

export function githubTreeUrl(repositoryPath: string): string {
  return `${siteConfig.githubRepo}/tree/${REPOSITORY_BRANCH}/${encodeRepositoryPath(repositoryPath)}`
}

function modelPathToRepositoryPath(modelPath: string): string {
  return `${PUBLIC_MODELS_REPOSITORY_ROOT}/${modelPath.replace(/^\/+/, "")}`
}

function basename(path: string): string {
  return path.slice(path.lastIndexOf("/") + 1)
}

export interface RepositoryAsset {
  fileName: string
  repositoryPath: string
  githubUrl: string
}

export interface CaseRepositoryAsset extends RepositoryAsset {
  templateIds: readonly string[]
}

function repositoryFileAsset(repositoryPath: string): RepositoryAsset {
  return {
    fileName: basename(repositoryPath),
    repositoryPath,
    githubUrl: githubBlobUrl(repositoryPath),
  }
}

function repositoryDirectoryAsset(repositoryPath: string): RepositoryAsset {
  return {
    fileName: basename(repositoryPath),
    repositoryPath,
    githubUrl: githubTreeUrl(repositoryPath),
  }
}

export const KEYCAP_GLB_DIRECTORY =
  "apps/web/public/models/keycaps/standard"
export const CASE_GLB_DIRECTORY = "apps/web/public/models/cases"
export const BLENDER_DIRECTORY = "artifacts/blender"
export const LAYOUT_DIRECTORY = "apps/web/modules/design/data/layouts"
export const JIG_DIRECTORY = "apps/web/modules/design/data/jig"
export const FONT_DIRECTORY = "apps/web/public/fonts"
export const MATERIAL_DIRECTORY = "apps/web/public/textures/materials"
export const SITE_IMAGE_DIRECTORY = "apps/web/public/images"
export const ENDCARD_DIRECTORY = "artifacts/video/endcard"

export const keycapGlbAssets: readonly RepositoryAsset[] =
  KEYCAP_MODEL_PATHS_BY_PROFILE.standard.map((modelPath) => {
    const repositoryPath = modelPathToRepositoryPath(modelPath)
    return repositoryFileAsset(repositoryPath)
  })

const caseAssetsByPath = new Map<
  string,
  { repositoryPath: string; templateIds: string[] }
>()

for (const [templateId, asset] of Object.entries(CASE_MODEL_REGISTRY)) {
  const repositoryPath = modelPathToRepositoryPath(asset.path)
  const entry = caseAssetsByPath.get(repositoryPath)

  if (entry) {
    entry.templateIds.push(templateId)
  } else {
    caseAssetsByPath.set(repositoryPath, {
      repositoryPath,
      templateIds: [templateId],
    })
  }
}

export const caseGlbAssets: readonly CaseRepositoryAsset[] = Array.from(
  caseAssetsByPath.values(),
  ({ repositoryPath, templateIds }) => ({
    fileName: basename(repositoryPath),
    repositoryPath,
    githubUrl: githubBlobUrl(repositoryPath),
    templateIds,
  }),
)

const BLENDER_REPOSITORY_PATHS = [
  "artifacts/blender/keybeds/ansi-60-contour-keybed.blend",
  "artifacts/blender/keybeds/ansi-65-contour-keybed.blend",
  "artifacts/blender/keybeds/ansi-75-contour-keybed.blend",
  "artifacts/blender/keybeds/ansi-75-84-contour-keybed.blend",
  "artifacts/blender/keybeds/ansi-tkl-contour-keybed.blend",
  "artifacts/blender/keybeds/ansi-1800-contour-keybed.blend",
  "artifacts/blender/keybeds/ansi-104-contour-keybed.blend",
  "artifacts/blender/keybeds/ansi-108-contour-keybed.blend",
  "artifacts/blender/keycaps/moa-keycaps.blend",
] as const

export const blenderAssets: readonly RepositoryAsset[] =
  BLENDER_REPOSITORY_PATHS.map(repositoryFileAsset)

export const layoutAssets: readonly RepositoryAsset[] = Object.keys(
  LAYOUT_REGISTRY,
).map((layoutId) =>
  repositoryFileAsset(`${LAYOUT_DIRECTORY}/${layoutId}.json`),
)

export const jigAssets: readonly RepositoryAsset[] = [
  `${JIG_DIRECTORY}/keycap_jig.svg`,
  `${JIG_DIRECTORY}/keycap_jig_positions.json`,
].map(repositoryFileAsset)

const FONT_FAMILIES = [
  "dm-mono",
  "ibm-plex-mono",
  "inter",
  "jetbrains-mono",
  "manrope",
  "noto-sans-sc",
  "noto-serif-sc",
  "obitron",
  "oxanium",
  "playfair-display",
  "space-grotesk",
] as const

export const fontFamilyAssets: readonly RepositoryAsset[] = FONT_FAMILIES.map(
  (family) => repositoryDirectoryAsset(`${FONT_DIRECTORY}/${family}`),
)

export const materialAssets: readonly RepositoryAsset[] = [
  `${MATERIAL_DIRECTORY}/wood-grain.webp`,
  `${MATERIAL_DIRECTORY}/LICENSE.md`,
].map(repositoryFileAsset)

const SITE_IMAGE_NAMES = [
  "feature_dark_en.png",
  "feature_dark_zh.png",
  "feature_light_en.png",
  "feature_light_zh.png",
  "hero_dark_en.png",
  "hero_dark_zh.png",
  "hero_light_en.png",
  "hero_light_zh.png",
] as const

export const siteImageAssets: readonly RepositoryAsset[] = [
  ...SITE_IMAGE_NAMES.map((fileName) =>
    repositoryFileAsset(`${SITE_IMAGE_DIRECTORY}/${fileName}`),
  ),
  repositoryFileAsset("apps/web/app/icon.svg"),
]

export const endcardAssets: readonly RepositoryAsset[] = [
  `${ENDCARD_DIRECTORY}/background.png`,
  `${ENDCARD_DIRECTORY}/endcard-1800x1200.png`,
].map(repositoryFileAsset)
