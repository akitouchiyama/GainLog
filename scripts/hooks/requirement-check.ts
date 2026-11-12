// 要件整合性チェック（project-structure.md 9.4）。LLM を使わないルールベースの検査。
// - 非目標キーワード（requirement.md 9章）：src/・migrations/ の追加行から検出
// - 技術スタック逸脱（requirement.md 6章）：package.json の依存を許可リストと照合
import { readFileSync } from 'node:fs'
import {
  fail,
  stagedAddedLines,
  stagedContent,
  stagedPaths,
  type AddedLine,
} from './git.ts'

export const ALLOWLIST_PATH = 'scripts/hooks/allowed-packages.json'
export const REQUIREMENT_PATH = 'docs/Requirements/requirement.md'

// ---------------------------------------------------------------------------
// 非目標キーワード
// ---------------------------------------------------------------------------

const KEYWORD_TARGET = /^(src|migrations)\//
const IGNORE = /(\/\/|--|\/\*|#)\s*requirement-check:\s*ignore\s+\S/

/**
 * 英単語のキーワード。前後がアルファベットでない場合と、camelCase の区切り
 * （例：weightLb・isAndroid）のときだけ一致させ、axios・album などの部分一致を避ける。
 * @param variants 単独で現れるときの表記（例：lb / Lb / LB）
 * @param camel camelCase の途中で現れるときの表記（例：Lb）
 * @param suffix 語尾（例：複数形の s）
 * @param except 直後に続くと除外する語（対応ブラウザ名。requirement.md 6章）
 */
const word = (
  variants: string[],
  camel: string,
  { suffix = '', except = '' } = {},
) => {
  const tail = `${suffix}(?![a-z])${except ? `(?!\\s*${except})` : ''}`
  return new RegExp(
    `(?<![A-Za-z])(?:${variants.join('|')})${tail}|(?<=[a-z])${camel}${tail}`,
  )
}

const KEYWORDS: { name: string; pattern: RegExp }[] = [
  { name: 'lb', pattern: word(['lb', 'Lb', 'LB'], 'Lb', { suffix: 's?' }) },
  { name: 'ポンド', pattern: /ポンド/ },
  { name: 'SNS', pattern: word(['sns', 'Sns', 'SNS'], 'Sns') },
  { name: 'ネイティブアプリ', pattern: /ネイティブアプリ/ },
  {
    name: 'iOS',
    pattern: word(['ios', 'iOS', 'IOS'], 'Ios', { except: 'Safari' }),
  },
  {
    name: 'Android',
    pattern: word(['android', 'Android', 'ANDROID'], 'Android', {
      except: 'Chrome',
    }),
  },
  { name: 'SAML', pattern: word(['saml', 'Saml', 'SAML'], 'Saml') },
  { name: 'SSO', pattern: word(['sso', 'Sso', 'SSO'], 'Sso') },
]

export type FileLine = AddedLine & { path: string }
export type KeywordViolation = FileLine & { keywords: string[] }

export function findNonGoalKeywords(lines: FileLine[]): KeywordViolation[] {
  return lines.flatMap((l) => {
    if (!KEYWORD_TARGET.test(l.path) || IGNORE.test(l.text)) return []
    const keywords = KEYWORDS.filter((k) => k.pattern.test(l.text)).map(
      (k) => k.name,
    )
    return keywords.length > 0 ? [{ ...l, keywords }] : []
  })
}

// ---------------------------------------------------------------------------
// 技術スタック逸脱
// ---------------------------------------------------------------------------

export type Allowlist = { technologies: Record<string, string[]> }

export function allowedPackages(list: Allowlist): Set<string> {
  return new Set(Object.values(list.technologies).flat())
}

const DEPENDENCY_FIELDS = [
  'dependencies',
  'devDependencies',
  'optionalDependencies',
  'peerDependencies',
] as const

/** package.json に書かれた依存のうち、許可リストにないもの */
export function findDisallowedDependencies(
  packageJson: string,
  allow: Set<string>,
): string[] {
  const pkg = JSON.parse(packageJson) as Partial<
    Record<(typeof DEPENDENCY_FIELDS)[number], Record<string, string>>
  >
  return DEPENDENCY_FIELDS.flatMap((field) =>
    Object.keys(pkg[field] ?? {}).filter((name) => !allow.has(name)),
  )
}

/** 許可リストの変更に requirement.md（6章）の変更が伴っていないか */
export function missingRequirementUpdate(changedPaths: string[]): boolean {
  return (
    changedPaths.includes(ALLOWLIST_PATH) &&
    !changedPaths.includes(REQUIREMENT_PATH)
  )
}

// ---------------------------------------------------------------------------
// フックの入口
// ---------------------------------------------------------------------------

if (import.meta.main) {
  const paths = stagedPaths()
  const errors: string[] = []

  const lines = paths
    .filter((p) => KEYWORD_TARGET.test(p))
    .flatMap((path) => stagedAddedLines(path).map((l) => ({ path, ...l })))
  for (const v of findNonGoalKeywords(lines)) {
    errors.push(
      `${v.path}:${v.line} 非目標キーワード（${v.keywords.join('・')}。requirement.md 9章）: ${v.text.trim()}`,
    )
  }

  if (paths.includes('package.json') || paths.includes(ALLOWLIST_PATH)) {
    const allowlistJson = paths.includes(ALLOWLIST_PATH)
      ? stagedContent(ALLOWLIST_PATH)
      : readFileSync(ALLOWLIST_PATH, 'utf8')
    const allow = allowedPackages(JSON.parse(allowlistJson) as Allowlist)
    for (const name of findDisallowedDependencies(
      stagedContent('package.json'),
      allow,
    )) {
      errors.push(
        `package.json: ${name} は許可リスト（${ALLOWLIST_PATH}）にない。requirement.md 6章への追記と許可リストの更新を同じコミットで行う`,
      )
    }
  }

  if (missingRequirementUpdate(paths)) {
    errors.push(
      `${ALLOWLIST_PATH} を変更するコミットには ${REQUIREMENT_PATH}（6章）の変更も含める`,
    )
  }

  if (errors.length > 0) {
    fail(
      '要件定義書との整合性チェックに失敗しました（誤検知は行末の `requirement-check: ignore <理由>` で除外できます）',
      errors,
    )
  }
}
