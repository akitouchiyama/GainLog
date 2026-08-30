# Architecture Decision Records (ADR)

GainLog における設計上の重要な判断を、背景・決定・結果とともに記録する。

## 目的

- 「なぜこの構成にしたのか」を後から追えるようにする。
- 一度合意した判断を蒸し返さないための参照点にする。
- 前提が変わって判断を見直す場合は、旧 ADR を `Superseded` にして新しい ADR を追加する（履歴は消さない）。

## フォーマット

各 ADR は以下の軽量フォーマットに従う。

```markdown
# NNNN. タイトル

- Status: Accepted | Superseded by ADR-XXXX | Deprecated
- Date: YYYY-MM-DD

## Context
（何を決める必要があったか。制約・前提）

## Decision
（何を決めたか）

## Consequences
（その結果として得られるもの・失うもの・注意点）
```

## 一覧

| # | タイトル | Status |
|---|---|---|
| [0001](0001-cloudflare-workers-monolith.md) | Cloudflare Workers 単一プロジェクトのモノリシック構成 | Accepted |
| [0002](0002-production-only-no-staging.md) | 本番環境のみとし、ステージング・検証環境を設けない | Accepted |
| [0003](0003-single-main-branch.md) | ブランチは main のみ（develop なし）とし、マージで自動デプロイ | Accepted |
| [0004](0004-drizzle-orm-and-migrations.md) | Drizzle ORM 採用、マイグレーションはローカル生成・CI 適用 | Accepted |
| [0005](0005-bff-cookie-session-auth.md) | 認証は BFF ＋ Cookie セッション方式、allowlist ＋ `sub` 識別 | Accepted |
| [0006](0006-error-code-maps-to-http-status.md) | 共通エラーの `code` を HTTP ステータスと 1 対 1 に対応させる | Accepted |
| [0007](0007-single-package-layout.md) | 詳細設計のディレクトリ構成は単一パッケージとする | Accepted |
