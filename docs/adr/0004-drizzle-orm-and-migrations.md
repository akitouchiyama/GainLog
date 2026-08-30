# 0004. Drizzle ORM 採用、マイグレーションはローカル生成・CI 適用

- Status: Accepted
- Date: 2026-08（基本設計フェーズ）

## Context

Cloudflare D1 に対する ORM とマイグレーション管理の方式を決める必要があった。CI 上でスキーマ差分を生成するか、生成物をコミットするかも論点だった。

## Decision

ORM 兼マイグレーションツールとして Drizzle ORM / drizzle-kit を採用する（`requirement.md` 6章に追記済み）。

- マイグレーションファイルは開発者がローカルで `drizzle-kit generate` により生成し、リポジトリにコミットする。CI ではファイル生成を行わない。
- CI/CD のデプロイフロー内で、`wrangler deploy` に先立ち `wrangler d1 migrations apply` で生成済みマイグレーションを自動適用する。
- スキーマ変更は後方互換な変更（カラム追加等）に限定する。破壊的変更が必要な場合は複数回のデプロイに分割する。
- `wrangler deploy` 失敗時は DB ロールバックせず、CI を再実行して `wrangler deploy` のみ再試行する。

## Consequences

- スキーマ定義を TypeScript の型として扱え、クエリはパラメータ化される（SQL インジェクション対策の主軸、ADR-0005 参照）。
- マイグレーション適用後に `wrangler deploy` が失敗すると、旧 Worker が新スキーマに接続する状態が生じ得るため、後方互換制約が必須となる（ADR-0002 でステージングを持たない判断とセット）。
- マイグレーションファイルの配置・命名規則は詳細設計（`project-structure.md` / `backend.md`）で確定する。
