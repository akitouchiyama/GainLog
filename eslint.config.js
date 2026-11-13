// ESLint flat config（project-structure.md 3.2、backend.md 2.4、frontend.md 2.3・13章、test.md 9.2）
import js from '@eslint/js'
import prettier from 'eslint-config-prettier'
import { defineConfig } from 'eslint/config'
import globals from 'globals'
import tseslint from 'typescript-eslint'

// ---------------------------------------------------------------------------
// import 制限（@typescript-eslint/no-restricted-imports）
//
// flat config では同じルールを後の設定で指定すると前の指定は丸ごと置き換わる。
// そこで「スコープ（対象パス）ごとに、適用される禁止をすべて並べたリスト」を作り、
// 本番コード用とテストコード用の設定を対で生成する。
// 領域をまたぐ相対 import は `../` の連続で始まる形しかないため、正規表現で判定する
// （例：client の `lib/api.ts` を api と誤認しないように、`../lib/api` は対象外）。
// ---------------------------------------------------------------------------

/** @typedef {{ name: string, message: string } | { group: string[], message: string, allowTypeImports?: boolean } | { regex: string, message: string, allowTypeImports?: boolean }} Restriction */

/** `../` の連続の直後が dir（任意で prefix/ を挟む）である相対 import */
const upTo = (/** @type {string} */ dir, prefix = '') =>
  `^(\\.\\./)+${prefix ? `(${prefix}/)?` : ''}${dir}(/|$)`

/** @satisfies {Record<string, Restriction>} */
const R = {
  hono: { name: 'hono', message: 'hono はここでは使えない（PS 3.1）。' },
  honoAll: {
    group: ['hono/**'],
    message:
      'shared は純粋な TypeScript ＋ zod のみ。hono は使えない（PS 3.1）。',
  },
  honoSub: {
    group: ['hono/**', '!hono/client'],
    message:
      'hono はここでは使えない（client は hono/client のみ可。PS 3.2）。',
  },
  honoScoped: {
    group: ['@hono/*'],
    message: '@hono/* はここでは使えない（PS 3.1）。',
  },
  drizzle: {
    group: ['drizzle-orm', 'drizzle-orm/**'],
    message:
      'drizzle-orm は src/api/infrastructure/** でのみ使える（backend.md 2.4、auth.md 13章）。',
  },
  jose: {
    group: ['jose', 'jose/**'],
    message:
      'jose は src/api/infrastructure/** でのみ使える（backend.md 2.4）。',
  },
  react: {
    group: ['react', 'react/**', 'react-dom', 'react-dom/**'],
    message: 'react はここでは使えない（PS 3.1）。',
  },
  sharedToOthers: {
    regex: upTo('(api|client)'),
    message: 'shared から api / client は import できない（PS 3.1）。',
  },
  apiToClient: {
    regex: upTo('client'),
    message: 'api から client は import できない（PS 3.1）。',
  },
  clientToApi: {
    regex: '^(\\.\\./)+api/(?!index(\\.ts)?$)',
    message:
      'client から api は import できない。例外は src/api/index.ts からの import type のみ（PS 3.1）。',
  },
  clientToApiIndex: {
    regex: '^(\\.\\./)+api(/index(\\.ts)?)?$',
    allowTypeImports: true,
    message:
      'src/api/index.ts からは import type（AppType）のみ可。値の import は禁止（PS 3.1・4.5）。',
  },
  toInfrastructure: {
    regex: upTo('infrastructure', 'api'),
    message:
      'infrastructure は interface/container.ts からのみ import できる（backend.md 2.4）。',
  },
  toInterface: {
    regex: upTo('interface', 'api'),
    message: 'interface はここから import できない（backend.md 2.4）。',
  },
  toApplication: {
    regex: upTo('application', 'api'),
    message: 'domain から application は import できない（backend.md 2.4）。',
  },
  toFeatures: {
    regex: upTo('features', 'client'),
    message:
      'components/ui・lib から features は import できない（frontend.md 2.3）。',
  },
  toPages: {
    regex: upTo('pages', 'client'),
    message:
      'components/ui・lib・features から pages は import できない（frontend.md 2.3）。',
  },
  toRecords: {
    regex: upTo('records', 'features'),
    message:
      'features/exercises から features/records は import できない（依存は records → exercises の一方向。frontend.md 2.3）。',
  },
  // 本番コードのみに適用（test.md 9.2、PS 3.2）
  cloudflareTest: {
    name: 'cloudflare:test',
    message: 'cloudflare:test はテストコードでのみ使える（PS 3.2）。',
  },
  testing: {
    regex: '(^|/)testing(/|$)',
    message: 'testing/ はテストコードからのみ import できる（test.md 9.2）。',
  },
}

const TEST_FILES = ['**/*.test.ts', '**/*.test.tsx', '**/testing/**']
const PROD_ONLY = [R.cloudflareTest, R.testing]

const SHARED = [
  R.hono,
  R.honoAll,
  R.honoScoped,
  R.drizzle,
  R.react,
  R.sharedToOthers,
]
const CLIENT = [
  R.hono,
  R.honoSub,
  R.honoScoped,
  R.drizzle,
  R.clientToApi,
  R.clientToApiIndex,
]
const API_CROSS = [R.apiToClient, R.react]
const API_OUTSIDE_INFRA = [...API_CROSS, R.drizzle, R.jose]

/** @param {Restriction[]} list */
const toOptions = (list) => ({
  paths: list.filter((r) => 'name' in r),
  patterns: list.filter((r) => !('name' in r)),
})

/**
 * @param {Restriction[]} list
 * @returns {import('eslint').Linter.RulesRecord}
 */
const rule = (list) => ({
  '@typescript-eslint/no-restricted-imports': ['error', toOptions(list)],
})

/**
 * スコープごとに本番用（テストを除く）とテスト用の設定を作る。
 * @param {string} name
 * @param {string[]} files
 * @param {Restriction[]} prod 本番コードに適用する禁止（PROD_ONLY は自動で足す）
 * @param {Restriction[] | null} test テストコードに適用する禁止（null ならテスト用は作らない）
 * @param {string[]} [extraIgnores]
 */
const scope = (name, files, prod, test, extraIgnores = []) => {
  /** @type {import('eslint').Linter.Config[]} */
  const configs = [
    {
      name: `gainlog/imports/${name}`,
      files,
      ignores: [...TEST_FILES, ...extraIgnores],
      rules: rule([...prod, ...PROD_ONLY]),
    },
  ]
  if (test) {
    configs.push({
      name: `gainlog/imports/${name}/test`,
      files: files.flatMap((f) => TEST_FILES.map((t) => [f, t])),
      rules: rule(test),
    })
  }
  return configs
}

export default defineConfig(
  {
    name: 'gainlog/ignores',
    ignores: [
      'dist/',
      '.wrangler/',
      'coverage/',
      'playwright-report/',
      'test-results/',
      'docs/',
      'migrations/',
      'worker-configuration.d.ts',
    ],
  },
  js.configs.recommended,
  tseslint.configs.recommendedTypeChecked,
  {
    name: 'gainlog/typed-linting',
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    name: 'gainlog/node-globals',
    files: ['*.{js,ts}', 'scripts/**'],
    languageOptions: { globals: globals.node },
  },
  {
    name: 'gainlog/browser-globals',
    files: ['src/client/**'],
    languageOptions: { globals: globals.browser },
  },
  {
    name: 'gainlog/use-ts-restricted-imports',
    rules: { 'no-restricted-imports': 'off' },
  },

  // shared：純粋な TypeScript ＋ zod のみ（PS 3.1）
  ...scope('shared', ['src/shared/**'], SHARED, SHARED),

  // client（PS 3.2、frontend.md 2.3）。client 内部のルールはテストにも適用する
  ...scope('client', ['src/client/**'], CLIENT, CLIENT),
  ...scope(
    'client/ui-lib',
    ['src/client/components/ui/**', 'src/client/lib/**'],
    [...CLIENT, R.toFeatures, R.toPages],
    [...CLIENT, R.toFeatures, R.toPages],
  ),
  ...scope(
    'client/features',
    ['src/client/features/**'],
    [...CLIENT, R.toPages],
    [...CLIENT, R.toPages],
  ),
  ...scope(
    'client/features/exercises',
    ['src/client/features/exercises/**'],
    [...CLIENT, R.toPages, R.toRecords],
    [...CLIENT, R.toPages, R.toRecords],
  ),

  // api（PS 3.2、backend.md 2.4）。テストは層ルールのみ緩和する
  ...scope('api', ['src/api/**'], API_OUTSIDE_INFRA, API_CROSS),
  ...scope(
    'api/domain',
    ['src/api/domain/**'],
    [...API_OUTSIDE_INFRA, R.toInfrastructure, R.toInterface, R.toApplication],
    null,
  ),
  ...scope(
    'api/application',
    ['src/api/application/**'],
    [...API_OUTSIDE_INFRA, R.toInfrastructure, R.toInterface],
    null,
  ),
  ...scope(
    'api/infrastructure',
    ['src/api/infrastructure/**'],
    [...API_CROSS, R.toInterface],
    null,
  ),
  ...scope(
    'api/interface',
    ['src/api/interface/**'],
    [...API_OUTSIDE_INFRA, R.toInfrastructure],
    null,
    ['src/api/interface/container.ts'],
  ),

  // dangerouslySetInnerHTML の禁止（frontend.md 13章）
  {
    name: 'gainlog/no-dangerously-set-inner-html',
    files: ['src/client/**/*.tsx'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: 'JSXAttribute[name.name="dangerouslySetInnerHTML"]',
          message: 'dangerouslySetInnerHTML は使用禁止（auth.md 2章・11章）。',
        },
      ],
    },
  },

  prettier,
)
