# 0008. バリデーションは Zod に統一し、shared のスキーマを正本とする

- Status: Accepted
- Date: 2026-09-20

## Context

バリデーションライブラリの定義が 3 か所で食い違っていた。

- `requirement.md` 6章: Backend に Zod と Valibot、Frontend に Valibot。
- `openapi.yaml`: 実装時に `@hono/zod-openapi`（Zod）でルート定義する前提。
- ADR-0007: Valibot スキーマを `src/shared` で front / back 共有する。

一方、`common-spec.md` 3章と `requirement.md` 5.1 は、API と UI で同一の入力制約・メッセージ文言を適用することを求めている。スキーマの定義元を 1 か所に集約する必要がある。

選択肢は次の 3 つだった。

| 案 | 内容 | 主なトレードオフ |
|---|---|---|
| A. Valibot 統一 | 要件 6章・ADR-0007 の記述に最も多く現れる | バンドルが小さく FCP・Lighthouse に有利。Hono の OpenAPI 生成統合は Zod 側が公式に厚く、Valibot ではサードパーティや Standard Schema 経由になる可能性がある（未確認） |
| **B. Zod 統一（採用）** | `@hono/zod-openapi` でルート定義と OpenAPI 生成を公式に統合できる | フロントのバンドルが大きくなりうる。要件 6章・ADR-0007 の Valibot 記述の修正が必要 |
| C. 併用（back: Zod / front: Valibot） | 現行 6章の字面に近い | 同一制約・文言を二重定義することになり、「API・UI で同一」の保証が難しい |

## Decision

バリデーションは **Zod に統一**する（案 B）。

- `src/shared` のスキーマ・型・制約値・メッセージ文言を、API・UI・Drizzle スキーマ（CHECK）の共通の出所（正本）とする。型は `z.infer` から得る。
- shared のスキーマは素の `zod`（メタデータは Zod 4 の `.meta()`）で書き、`@hono/zod-openapi` を shared から import しない。`.openapi()` などの拡張は `src/api` 側でのみ適用する。
- API の呼び出しは Hono RPC（`hc<AppType>`）で行い、`client` から `src/api/index.ts` の `AppType` を `import type` することだけを依存方向ルールの例外とする。RPC で得られるのは型のみのため、フォームの入力検証・エラー文言・制約値は引き続き shared を使う。ルート定義・結合のメソッドチェーンが必須であることは一次情報で確認済み（`docs/Design/Detailed/backend.md` 3.1）。残る型推論コスト・Workers 型の解決は実装フェーズ最初のタスクで確認し、成立しない場合は「shared の型 ＋ 薄い fetch ラッパ」に戻す。`openapi-typescript` は依存と生成手順が増え、shared と役割が重なるため採用しない。
- `openapi.yaml` は基本設計時点のスナップショットとして凍結し、実装後は追従させない。最新の API 仕様が必要な場合は `@hono/zod-openapi` でコードから生成する（生成経路は npm script でのファイル出力に確定済み。公開はしない。`docs/Design/Detailed/backend.md` 11章）。

詳細は `docs/Design/Detailed/project-structure.md` 4章。

## Consequences

- `requirement.md` 6章から Valibot を外し、Zod を Backend・Frontend 双方に記載する。ADR-0007 の「Valibot」記述は Zod に最小修正する（構成の決定自体は変わらないため Status は Accepted のまま）。
- Zod は Valibot よりバンドルが大きい。FCP 3 秒・Lighthouse 80（`requirement.md` 6章）への影響は、実装後に計測して判断する（必要なら `zod/mini` 等を検討）。
- 一次情報で確認できた範囲: `@hono/zod-openapi` 1.6.3 は Zod ^4 が peer、`@asteasolutions/zod-to-openapi` は v8 以降（Zod 4）で `.meta()` に対応する。**shared の素のスキーマを `createRoute` にそのまま渡せることは、公式ドキュメントに明記がなく未確認**であり、実装フェーズ最初のタスクで確認する。成立しない場合も Zod 統一は維持し、api 側でのラップ方法を見直す。
- `zod` は単一インスタンスに保つ（pnpm の peer 依存解決）。
- `openapi.yaml` を凍結するため、生成仕様との差分検知は行わない。基本設計書の他文書（`common-spec.md`・`screens.md`・`db.md`）からの `openapi.yaml` への参照は、基本設計時点の設計として読む。
