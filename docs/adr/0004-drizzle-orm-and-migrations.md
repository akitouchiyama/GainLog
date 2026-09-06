# 0004. Drizzle ORM 採用、マイグレーションはローカル生成・CI 適用

- Status: Accepted
- Date: 2026-08（基本設計フェーズ）

## Context

Cloudflare D1 に対する ORM とマイグレーション管理の方式を決める必要があった。CI 上でスキーマ差分を生成するか、生成物をコミットするかも論点だった。

## Decision

ORM 兼マイグレーションツールとして Drizzle ORM / drizzle-kit を採用する（`requirement.md` 6章に追記済み）。

- マイグレーションファイルは開発者がローカルで `drizzle-kit generate` により生成し、リポジトリにコミットする。CI ではファイル生成を行わない。
- CI/CD のデプロイフロー内で、`wrangler deploy` に先立ち生成済みマイグレーションを本番 D1 に自動適用する（対象 D1 と実行環境を明示するため、CI では `wrangler d1 migrations apply <DB_NAME> --remote` 相当の起動になる）。厳密なコマンド・オプションは `architecture.md` 7章および詳細設計で確定する。
- スキーマ変更は後方互換な変更（カラム追加等）に限定する。破壊的変更が必要な場合は複数回のデプロイに分割する。
- `wrangler deploy` 失敗時は DB ロールバックせず、CI を再実行して `wrangler deploy` のみ再試行する。

## Consequences

- スキーマ定義を TypeScript の型として扱える。クエリビルダおよび `sql` テンプレートリテラルの補間値は自動でパラメータ化され、これを SQL インジェクション対策の主軸とする（メールアドレス等 PII の平文保存を許容する前提になっている。`auth.md` 4章・11章）。ただし `sql.raw()` や文字列連結はパラメータ化・エスケープされないため、未信頼値をこれらに渡さない規約を詳細設計（`backend.md`）で明記する。
- マイグレーション適用後に `wrangler deploy` が失敗すると、旧 Worker が新スキーマに接続する状態が生じ得るため、後方互換制約が必須となる（ADR-0002 でステージングを持たない判断とセット）。
- マイグレーションファイルの配置・命名規則は詳細設計（`project-structure.md` / `backend.md`）で確定する。特に drizzle-kit の `out`（生成先）と Wrangler の `migrations_dir` / `migrations_pattern` を、CI の `wrangler d1 migrations apply` がコミット済み SQL を検出できるよう整合させる（既定の `migrations/*.sql` を使うか、Drizzle のネスト出力に合わせて `migrations_pattern` を設定するか）ことを契約として定める。
