// migration 再作成ガード（project-structure.md 8.3・9.2）。
// drizzle-kit が生成するテーブル再作成 SQL（__new_ / DROP TABLE）は、トリガーの消失や
// FK の CASCADE による子行の全件削除を起こしうるため、レビュー済みの印がなければ止める。
// 親テーブルの DROP は、D1 では PRAGMA foreign_keys=OFF が効かず子行が消えるため、印があっても止める。
import { fail, stagedAddedLines, stagedContent, stagedPaths } from './git.ts'

export type MigrationChange = {
  path: string
  /** ステージ済みのファイル全文 */
  content: string
  /** 差分で追加された行の行番号（1 始まり） */
  addedLineNumbers: number[]
}
export type Violation = { path: string; reason: string }

/** 子テーブルから ON DELETE CASCADE / RESTRICT で参照される親テーブル（db.md） */
export const PARENT_TABLES = ['users', 'exercises', 'workout_records'] as const

const TARGET = /^migrations\/[^/]+\.sql$/
const MARK = /^--\s*reviewed-rebuild:\s*\S/
const REBUILD = /__new_|\bdrop\s+table\b/i
// 識別子は素のまま・バッククォート・ダブルクォート・角括弧で囲まれうる。スキーマ名（main. 等）も付きうる
const IDENT = String.raw`[\x60"\[]?\w+[\x60"\]]?`
const PARENT_DROP = new RegExp(
  String.raw`\bdrop\s+table\s+(?:if\s+exists\s+)?(?:${IDENT}\s*\.\s*)?[\x60"\[]?(?:${PARENT_TABLES.join('|')})(?![\w])`,
  'i',
)

/** 行末までの SQL コメント（--）を除く。文字列リテラル内の -- は考慮しない */
const stripComment = (line: string) => line.replace(/--.*$/, '')

/**
 * ファイル全体を `;` で文に分け、追加行を 1 行でも含む文を、改行・連続空白を 1 つの空白に
 * まとめて返す。文が複数行にまたがる場合や、文の一部だけが変更された場合も文全体で判定するため。
 * 文字列リテラル内の `;` は考慮しない。
 */
export function changedStatements(
  content: string,
  addedLineNumbers: number[],
): string[] {
  const added = new Set(addedLineNumbers)
  const statements: string[] = []
  let parts: string[] = []
  let touched = false
  const flush = () => {
    const text = parts.join(' ').replace(/\s+/g, ' ').trim()
    if (touched && text !== '') statements.push(text)
    parts = []
    touched = false
  }
  content.split('\n').forEach((raw, i) => {
    const segments = stripComment(raw).split(';')
    segments.forEach((segment, j) => {
      parts.push(segment)
      // 中身のある部分、または文を終わらせる `;` を含む追加行は、その文の変更とみなす
      const terminates = j < segments.length - 1
      if (added.has(i + 1) && (segment.trim() !== '' || terminates))
        touched = true
      if (terminates) flush()
    })
  })
  flush()
  return statements
}

export function checkMigration(change: MigrationChange): Violation[] {
  const { path, content, addedLineNumbers } = change
  if (!TARGET.test(path)) return []

  const code = changedStatements(content, addedLineNumbers)
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
        addedLineNumbers: stagedAddedLines(path).map((l) => l.line),
      }),
    )
  if (violations.length > 0) {
    fail(
      'migration にテーブル再作成が含まれています',
      violations.map((v) => `${v.path}: ${v.reason}`),
    )
  }
}
