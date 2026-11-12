import { describe, expect, it } from 'vitest'
import { findForbiddenFiles, MAX_FILE_SIZE } from './forbidden-files.ts'

const file = (path: string, size = 100) => ({ path, size })
const paths = (files: ReturnType<typeof file>[]) =>
  findForbiddenFiles(files).map((v) => v.path)

describe('findForbiddenFiles', () => {
  it('通常のファイルは違反なし', () => {
    expect(findForbiddenFiles([file('src/api/index.ts')])).toEqual([])
  })

  it('.dev.vars を拒否する', () => {
    const [violation, ...rest] = findForbiddenFiles([file('.dev.vars')])
    expect(violation?.path).toBe('.dev.vars')
    expect(violation?.reason).toContain('.dev.vars.example')
    expect(rest).toEqual([])
  })

  it('サブディレクトリの .dev.vars も拒否する', () => {
    expect(paths([file('dist/gainlog/.dev.vars')])).toEqual([
      'dist/gainlog/.dev.vars',
    ])
  })

  it('.dev.vars.example は許可する', () => {
    expect(paths([file('.dev.vars.example')])).toEqual([])
  })

  it('環境別の .dev.vars.<env> を拒否する', () => {
    expect(paths([file('.dev.vars.production')])).toEqual([
      '.dev.vars.production',
    ])
  })

  it.each(['.env', '.env.local', 'e2e/.env.test'])('%s を拒否する', (p) => {
    expect(paths([file(p)])).toEqual([p])
  })

  it('.env を含むだけの名前は通す', () => {
    expect(paths([file('src/shared/env.ts'), file('.envrc.md')])).toEqual([])
  })

  it.each(['key.pem', 'certs/server.key', 'a.p12', 'b.pfx', 'UPPER.PEM'])(
    '秘密鍵類 %s を拒否する',
    (p) => {
      expect(paths([file(p)])).toEqual([p])
    },
  )

  it.each(['.wrangler/state/v3/d1/db.sqlite', 'sub/.wrangler/tmp/x.js'])(
    '.wrangler/ 配下 %s を拒否する',
    (p) => {
      expect(paths([file(p)])).toEqual([p])
    },
  )

  it('1MB ちょうどは許可し、1MB を超えると拒否する', () => {
    expect(MAX_FILE_SIZE).toBe(1024 * 1024)
    expect(paths([file('ok.bin', MAX_FILE_SIZE)])).toEqual([])
    expect(paths([file('big.bin', MAX_FILE_SIZE + 1)])).toEqual(['big.bin'])
  })

  it('違反が複数あればすべて報告する（理由も区別する）', () => {
    const result = findForbiddenFiles([
      file('.dev.vars'),
      file('src/ok.ts'),
      file('key.pem', MAX_FILE_SIZE + 1),
    ])
    expect(result.map((v) => v.path)).toEqual([
      '.dev.vars',
      'key.pem',
      'key.pem',
    ])
    expect(new Set(result.map((v) => v.reason)).size).toBe(3)
  })
})
