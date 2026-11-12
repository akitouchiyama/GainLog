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

/** ステージ済みの差分で追加された行（`+` で始まる行。ヘッダは除く） */
export function stagedAddedLines(path: string): string[] {
  return git(['diff', '--cached', '-U0', '--no-color', '--', path])
    .split('\n')
    .filter((l) => l.startsWith('+') && !l.startsWith('+++'))
    .map((l) => l.slice(1))
}

/** 違反を表示して終了コード 1 で終える */
export function fail(title: string, lines: string[]): never {
  console.error(`✖ ${title}`)
  for (const l of lines) console.error(`  - ${l}`)
  process.exit(1)
}
