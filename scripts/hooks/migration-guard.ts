// migration 再作成ガード（project-structure.md 8.3・9.2）。
// drizzle-kit が生成するテーブル再作成 SQL（__new_ / DROP TABLE）は、トリガーの消失や
// FK の CASCADE による子行の全件削除を起こしうるため、レビュー済みの印がなければ止める。
// 親テーブルの DROP は、D1 では PRAGMA foreign_keys=OFF が効かず子行が消えるため、印があっても止める。
import { fail, stagedAddedLines, stagedContent, stagedPaths } from './git.ts'

export type MigrationChange = {
  path: string
  /** ステージ済みのファイル全文 */
  content: string
  /** 差分で追加された行 */
  addedLines: string[]
}
export type Violation = { path: string; reason: string }

/** 子テーブルから ON DELETE CASCADE / RESTRICT で参照される親テーブル（db.md） */
export const PARENT_TABLES = ['users', 'exercises', 'workout_records'] as const

const TARGET = /^migrations\/[^/]+\.sql$/
const MARK = /^--\s*reviewed-rebuild:\s*\S/
const REBUILD = /__new_|\bdrop\s+table\b/i
const PARENT_DROP = new RegExp(
  String.raw`\bdrop\s+table\s+(if\s+exists\s+)?[\x60"\[]?(${PARENT_TABLES.join('|')})(?![\w])`,
  'i',
)

/** 行末までの SQL コメント（--）を除く。文字列リテラル内の -- は考慮しない */
const stripComment = (line: string) => line.replace(/--.*$/, '')

export function checkMigration(change: MigrationChange): Violation[] {
  const { path, content, addedLines } = change
  if (!TARGET.test(path)) return []

  const code = addedLines.map(stripComment)
  if (code.some((l) => PARENT_DROP.test(l))) {
    return [
      {
        path,
        reason: `親テーブル（${PARENT_TABLES.join('・')}）の DROP TABLE は禁止（reviewed-rebuild の印があっても不可）。子行が CASCADE で全件消えるため、退避・復元の手順を設計してから扱う（project-structure.md 8.3）`,
      },
    ]
  }
  if (!code.some((l) => REBUILD.test(l))) return []

  const firstLine = content.split('\n').find((l) => l.trim() !== '') ?? ''
  if (MARK.test(firstLine.trim())) return []
  return [
    {
      path,
      reason:
        'テーブル再作成（__new_ / DROP TABLE）を含む。トリガーの再作成などを確認したうえで、先頭行に `-- reviewed-rebuild: <理由>` を書く（project-structure.md 8.3）',
    },
  ]
}

if (import.meta.main) {
  const violations = stagedPaths()
    .filter((p) => TARGET.test(p))
    .flatMap((path) =>
      checkMigration({
        path,
        content: stagedContent(path),
        addedLines: stagedAddedLines(path),
      }),
    )
  if (violations.length > 0) {
    fail(
      'migration にテーブル再作成が含まれています',
      violations.map((v) => `${v.path}: ${v.reason}`),
    )
  }
}
