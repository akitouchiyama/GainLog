import { describe, expect, it } from 'vitest'
import {
  ALLOWLIST_PATH,
  REQUIREMENT_PATH,
  allowedPackages,
  findDisallowedDependencies,
  findNonGoalKeywords,
  missingRequirementUpdate,
} from './requirement-check.ts'

const at = (text: string, path = 'src/client/x.ts') => [{ path, line: 1, text }]
const hits = (text: string, path?: string) =>
  findNonGoalKeywords(at(text, path)).map((v) => v.keywords)

describe('findNonGoalKeywords（requirement.md 9章）', () => {
  it('関係のない行は通す', () => {
    expect(hits("const unit = 'kg'")).toEqual([])
  })

  it.each([
    "const unit = 'lb'",
    'const lbs = 1',
    "label: 'LB'",
    '// 10lb',
    'const weightLb = 1',
    'lbToKg(x)',
  ])('lb 系を拒否する: %s', (text) => {
    expect(hits(text)).toEqual([['lb']])
  })

  it.each(['album', 'const lbl = 1', 'clb'])(
    'lb を含むだけの語は通す: %s',
    (text) => {
      expect(hits(text)).toEqual([])
    },
  )

  it.each([
    ['// ポンド表示', 'ポンド'],
    ['// ネイティブアプリ版', 'ネイティブアプリ'],
    ["share('SNS')", 'SNS'],
    ['snsShare()', 'SNS'],
    ['// iOS アプリ', 'iOS'],
    ['isAndroid()', 'Android'],
    ["'SAML'", 'SAML'],
    ['enableSso', 'SSO'],
  ])('非目標キーワードを拒否する: %s', (text, keyword) => {
    expect(hits(text)).toEqual([[keyword]])
  })

  it.each([
    "import axios from 'axios'",
    'DNS',
    'lasso',
    'bios',
    '// iOS Safari の 100vh 対策',
    '// Android Chrome のバグ回避',
  ])('対応ブラウザ名や部分一致は通す: %s', (text) => {
    expect(hits(text)).toEqual([])
  })

  it('1 行に複数あれば 1 件にまとめる', () => {
    expect(hits('// SNS と SAML')).toEqual([['SNS', 'SAML']])
  })

  it('理由つきの除外コメントがあれば通す', () => {
    expect(
      hits('const re = /lb/ // requirement-check: ignore 検知ルールのテスト'),
    ).toEqual([])
    expect(
      hits(
        '-- SSO 列は作らない -- requirement-check: ignore 説明のみ',
        'migrations/0001.sql',
      ),
    ).toEqual([])
  })

  it('理由のない除外コメントでは通さない', () => {
    expect(hits("const u = 'lb' // requirement-check: ignore")).toEqual([
      ['lb'],
    ])
  })

  it('違反に path・line・text を含める', () => {
    expect(
      findNonGoalKeywords([{ path: 'src/a.ts', line: 7, text: "'lb'" }]),
    ).toEqual([{ path: 'src/a.ts', line: 7, text: "'lb'", keywords: ['lb'] }])
  })

  it.each(['migrations/0001.sql', 'src/shared/x.ts'])('%s は対象', (path) => {
    expect(hits("'lb'", path)).toEqual([['lb']])
  })

  it.each(['docs/x.md', 'scripts/hooks/x.ts', 'README.md', 'e2e/a.spec.ts'])(
    '%s は対象外',
    (path) => {
      expect(hits("'lb'", path)).toEqual([])
    },
  )
})

describe('allowedPackages', () => {
  it('技術名ごとのパッケージ名を 1 つの集合にする', () => {
    const allow = allowedPackages({
      technologies: { Hono: ['hono'], Drizzle: ['drizzle-orm', 'drizzle-kit'] },
    })
    expect([...allow].sort()).toEqual(['drizzle-kit', 'drizzle-orm', 'hono'])
  })
})

describe('findDisallowedDependencies（requirement.md 6章）', () => {
  const allow = new Set(['hono', 'vitest', 'zod', 'msw'])

  it('すべて許可リストにあれば通す', () => {
    const pkg = {
      dependencies: { hono: '^4' },
      devDependencies: { vitest: '5' },
    }
    expect(findDisallowedDependencies(JSON.stringify(pkg), allow)).toEqual([])
  })

  it('許可リストにない依存を種類ごとに検出する', () => {
    const pkg = {
      dependencies: { hono: '^4', axios: '^1' },
      devDependencies: { lodash: '^4' },
      optionalDependencies: { fsevents: '^2' },
      peerDependencies: { react: '^19' },
    }
    expect(findDisallowedDependencies(JSON.stringify(pkg), allow)).toEqual([
      'axios',
      'lodash',
      'fsevents',
      'react',
    ])
  })

  it('依存の欄がなくても失敗しない', () => {
    expect(findDisallowedDependencies('{"name":"x"}', allow)).toEqual([])
  })
})

describe('missingRequirementUpdate', () => {
  it('許可リストを変えて requirement.md を変えていなければ true', () => {
    expect(missingRequirementUpdate([ALLOWLIST_PATH])).toBe(true)
  })

  it('両方を変えていれば false', () => {
    expect(missingRequirementUpdate([ALLOWLIST_PATH, REQUIREMENT_PATH])).toBe(
      false,
    )
  })

  it('許可リストを変えていなければ false', () => {
    expect(missingRequirementUpdate(['package.json'])).toBe(false)
  })
})
