# 0007. 詳細設計のディレクトリ構成は単一パッケージとする

- Status: Accepted
- Date: 2026-08-30

## Context

詳細設計フェーズの入り口で、リポジトリのディレクトリ構成を決める必要があった。選択肢は「単一パッケージ（`package.json` 1 つ、ディレクトリで server / client / shared を分割）」と「npm/pnpm workspaces によるモノレポ（`packages/backend` `packages/frontend` `packages/shared`）」。

## Decision

単一パッケージ構成を採用する。`src/api`・`src/client`・`src/shared` のようにディレクトリで役割を分ける。

- バックエンドの公開面はすべて `/api/*`（OAuth ログイン系も `/api/auth/*`）で OpenAPI 仕様化されているため、ディレクトリ名は `server` ではなく `api` とし、実体と名前を一致させる。
- フロント・バックは同一 Cloudflare プロジェクト・同一 Worker にデプロイされる（ADR-0001）ため、パッケージ境界を分けても最終的な成果物は 1 つ。
- 型・バリデーションスキーマ（Valibot）は `src/shared` で front / back 共有する。
- 具体的なディレクトリレイアウト・ビルド構成（Vite + Wrangler）・Worker エントリポイント（静的アセットと Hono をパス振り分けする箇所）の配置は `docs/Design/Detailed/project-structure.md` で確定する。

## Consequences

- 依存関係管理・ビルド設定・ツールチェーンがシンプルになる。
- パッケージ境界による依存方向の強制（shared が api/client に依存しない等）はできないため、ディレクトリ規約と lint で担保する。
- 将来コードベースが大きくなり境界を明確にしたくなった場合は workspaces への移行を検討する。
