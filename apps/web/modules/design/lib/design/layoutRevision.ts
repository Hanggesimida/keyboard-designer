import {
  getLayoutData,
  type LayoutData,
} from "@/modules/design/data/layouts"

interface PositionedElement {
  x: number
  y: number
}

interface CoordinateMigration {
  fromRevision: number
  toRevision: number
  offsetXU: number
  offsetYU: number
}

const INITIAL_LAYOUT_REVISION = 1

const COORDINATE_MIGRATIONS: Readonly<
  Record<string, readonly CoordinateMigration[]>
> = {
  "ansi-61": [
    { fromRevision: 1, toRevision: 2, offsetXU: 0, offsetYU: -1.25 },
  ],
  "ansi-68": [
    { fromRevision: 1, toRevision: 2, offsetXU: 0, offsetYU: -1.25 },
  ],
  "ansi-81": [
    { fromRevision: 1, toRevision: 2, offsetXU: 0, offsetYU: -0.25 },
  ],
}

export interface LayoutElementMigrationResult<T> {
  layoutRevision: number
  elements: T[]
}

export function getCurrentLayoutRevision(templateId: string): number {
  return getLayoutData(templateId).revision
}

export function isSupportedLayoutRevision(
  layout: LayoutData,
  revision: unknown,
): revision is number {
  return (
    typeof revision === "number" &&
    Number.isInteger(revision) &&
    revision >= INITIAL_LAYOUT_REVISION &&
    revision <= layout.revision
  )
}

/** 将旧设计中的画板绝对坐标迁移到模板当前坐标修订。 */
export function migrateLayoutElements<T extends PositionedElement>(
  templateId: string,
  sourceRevision: number | undefined,
  elements: ReadonlyArray<T>,
): LayoutElementMigrationResult<T> {
  const layout = getLayoutData(templateId)
  let revision = sourceRevision ?? INITIAL_LAYOUT_REVISION
  if (!isSupportedLayoutRevision(layout, revision)) {
    throw new Error(
      `不支持布局 ${layout.id} 的坐标修订 ${String(sourceRevision)}`,
    )
  }
  let migrated = elements.map((element) => ({ ...element }))

  while (revision < layout.revision) {
    const migration = COORDINATE_MIGRATIONS[layout.id]?.find(
      (candidate) => candidate.fromRevision === revision,
    )
    if (!migration) {
      throw new Error(
        `缺少布局 ${layout.id} 从修订 ${revision} 到 ${layout.revision} 的坐标迁移`,
      )
    }

    const offsetX = migration.offsetXU * layout.baseUnit
    const offsetY = migration.offsetYU * layout.baseUnit
    migrated = migrated.map((element) => ({
      ...element,
      x: element.x + offsetX,
      y: element.y + offsetY,
    }))
    revision = migration.toRevision
  }

  return {
    layoutRevision: layout.revision,
    elements: migrated,
  }
}
