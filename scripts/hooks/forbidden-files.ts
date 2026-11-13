// 禁止ファイルガード（project-structure.md 2.2・9.2）。.gitignore との二重防御。
import { fail, stagedPaths, stagedSize } from './git.ts'

export type StagedFile = { path: string; size: number }
export type Violation = { path: string; reason: string }

/** これを超えるファイルは大容量として拒否する（1MB） */
export const MAX_FILE_SIZE = 1024 * 1024

type Rule = { test: (path: string, base: string) => boolean; reason: string }

const RULES: Rule[] = [
  {
    test: (_, base) =>
      /^\.dev\.vars(\..+)?$/.test(base) && base !== '.dev.vars.example',
    reason:
      'ローカルのシークレット（.dev.vars）。キーの一覧は .dev.vars.example に書く',
  },
  {
    test: (_, base) => /^\.env(\..+)?$/.test(base),
    reason: '環境変数ファイル（.env*）',
  },
  {
    test: (_, base) => /\.(pem|key|p12|pfx)$/i.test(base),
    reason: '秘密鍵・証明書の可能性があるファイル',
  },
  {
    test: (path) => /(^|\/)\.wrangler\//.test(path),
    reason: 'Wrangler のローカル状態（.wrangler/。ローカル D1 の実体を含む）',
  },
]

export function findForbiddenFiles(files: StagedFile[]): Violation[] {
  return files.flatMap(({ path, size }) => {
    const base = path.slice(path.lastIndexOf('/') + 1)
    const violations = RULES.filter((r) => r.test(path, base)).map((r) => ({
      path,
      reason: r.reason,
    }))
    if (size > MAX_FILE_SIZE) {
      violations.push({
        path,
        reason: `大容量ファイル（${size} バイト。上限 ${MAX_FILE_SIZE} バイト）`,
      })
    }
    return violations
  })
}

if (import.meta.main) {
  const files = stagedPaths().map((path) => ({ path, size: stagedSize(path) }))
  const violations = findForbiddenFiles(files)
  if (violations.length > 0) {
    fail(
      'コミットできないファイルがステージされています（git restore --staged <path> で外してください）',
      violations.map((v) => `${v.path}: ${v.reason}`),
    )
  }
}
