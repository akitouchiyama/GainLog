# 0009. 開発・ビルド構成は Vite ＋ `@cloudflare/vite-plugin` とする

- Status: Accepted
- Date: 2026-09-20

## Context

ローカル開発で「React SPA（HMR）」と「Hono API（workerd 上）」を、本番と同じ同一オリジンで動かす構成を決める必要があった（`architecture.md` 4章の「本番相当」、`auth.md` の同一オリジン・`__Host-` Cookie 前提）。

| 案 | 内容 | 主なトレードオフ |
|---|---|---|
| **A. Vite ＋ `@cloudflare/vite-plugin`（採用）** | Vite の開発サーバ内で Worker を workerd 上で実行し、Static Assets・ローカル D1 も統合。ビルドも `vite build` 一本 | プラグインの成熟度と不具合の有無に依存する。`requirement.md` 6章への追記が必要 |
| B. Vite（`vite dev`）＋ `wrangler dev` の二段構成 | フロントは Vite の開発サーバ、`/api` を `wrangler dev` へプロキシ | 実績が長く挙動が明快。開発時に 2 プロセスとなり、プロキシと Cookie（`__Host-`）まわりの差異に注意が必要 |
| C. `wrangler dev` のみ（ビルド済みを配信） | `vite build --watch` の成果物を配信 | 本番に最も近いが HMR が使えず開発体験が悪い |

## Decision

案 A を採用する。

- 一次情報で確認した状態（2026-09-20）: `@cloudflare/vite-plugin` は GA（1.56.0。peer: vite ^6〜^8、wrangler ^4.135.0）。ローカル D1 の状態は Wrangler と同じ `.wrangler/state` を既定で共有する。`wrangler.jsonc` には `not_found_handling` と `run_worker_first` を書き、`assets.directory` は `vite build` が生成する `wrangler.json` に自動設定される。
- `architecture.md` 1・4章の「ローカル開発は `wrangler dev`」は「Vite の開発サーバ（workerd 上で Worker を実行）」に読み替える。本番相当の環境を再現するという目的は変わらない。
- CI の実行順は「テスト → ビルド → マイグレーション → `wrangler deploy`」とする。

詳細は `docs/Design/Detailed/project-structure.md` 5・6章。

## Consequences

- 開発時のプロキシ・CORS 設定が不要で、同一オリジン前提の認証（`__Host-` Cookie）を開発時にも再現できる。
- **既知の懸念**: `@cloudflare/vite-plugin` 1.54.0 で、`wrangler d1 migrations apply --local` の後に `vite dev` を起動すると D1 が古いスキーマを読む不具合が報告されている（workers-sdk#15362、未 triage）。実装フェーズ最初のタスクで再現を確認し、再現する場合は案 B を再検討する。
- Storybook と Vitest（client・shared）が Worker 用プラグインを読み込まないよう、設定を分離する規約を置く（具体的な方法は `frontend.md`・`test.md`）。
