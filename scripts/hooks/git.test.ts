import { describe, expect, it } from 'vitest'
import { parseAddedLines } from './git.ts'

describe('parseAddedLines', () => {
  it('新規ファイルの追加行を 1 行目から数える', () => {
    const diff = [
      'diff --git a/x.ts b/x.ts',
      'new file mode 100644',
      '--- /dev/null',
      '+++ b/x.ts',
      '@@ -0,0 +1,2 @@',
      '+a',
      '+b',
    ].join('\n')
    expect(parseAddedLines(diff)).toEqual([
      { line: 1, text: 'a' },
      { line: 2, text: 'b' },
    ])
  })

  it('複数のハンクで行番号を引き継がず、削除行は数えない', () => {
    const diff = [
      '--- a/x.ts',
      '+++ b/x.ts',
      '@@ -3 +3 @@',
      '-old',
      '+new',
      '@@ -10,0 +11,1 @@',
      '+added',
      '@@ -20 +21 @@',
      '-removed only',
    ].join('\n')
    expect(parseAddedLines(diff)).toEqual([
      { line: 3, text: 'new' },
      { line: 11, text: 'added' },
    ])
  })

  it('`++` で始まる内容の行も追加行として扱う', () => {
    const diff = ['+++ b/x.ts', '@@ -0,0 +1 @@', '++i'].join('\n')
    expect(parseAddedLines(diff)).toEqual([{ line: 1, text: '+i' }])
  })
})
