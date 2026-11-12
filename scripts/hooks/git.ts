// Git フックから使う、ステージ済みの内容を読む薄いラッパ。判定ロジックは持たない。
import { execFileSync } from 'node:child_process'

const git = (args: string[]) =>
  execFileSync('git', args, { encoding: 'utf8', maxBuffer: 1e8 })

/** ステージ済みで、追加・コピー・変更・リネームされたファイルのパス */
export function stagedPaths(): string[] {
  return git(['diff', '--cached', '--name-only', '-z', '--diff-filter=ACMR'])
    .split('\0')
    .filter(Boolean)
}

/** ステージ済みの内容（インデックス上の blob）のバイト数 */
export function stagedSize(path: string): number {
  return Number(git(['cat-file', '-s', `:${path}`]).trim())
}

/** ステージ済みの内容（インデックス上の blob）全文 */
export function stagedContent(path: string): string {
  return git(['show', `:${path}`])
}

/** HEAD 時点の内容。HEAD に存在しなければ null */
export function headContent(path: string): string | null {
  try {
    return execFileSync('git', ['show', `HEAD:${path}`], {
      encoding: 'utf8',
      maxBuffer: 1e8,
      stdio: ['ignore', 'pipe', 'ignore'],
    })
  } catch {
    return null
  }
}

export type AddedLine = { line: number; text: string }

/** ステージ済みの差分で追加された行と、その行番号（ステージ後のファイル上） */
export function stagedAddedLines(path: string): AddedLine[] {
  return parseAddedLines(
    git(['diff', '--cached', '-U0', '--no-color', '--', path]),
  )
}

/** `git diff -U0` の出力から追加行を取り出す */
export function parseAddedLines(diff: string): AddedLine[] {
  const result: AddedLine[] = []
  let next = 0
  for (const l of diff.split('\n')) {
    const hunk = /^@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/.exec(l)
    if (hunk) {
      next = Number(hunk[1])
    } else if (l.startsWith('+') && !l.startsWith('+++')) {
      result.push({ line: next++, text: l.slice(1) })
    }
  }
  return result
}

/** 違反を表示して終了コード 1 で終える */
export function fail(title: string, lines: string[]): never {
  console.error(`✖ ${title}`)
  for (const l of lines) console.error(`  - ${l}`)
  process.exit(1)
}
