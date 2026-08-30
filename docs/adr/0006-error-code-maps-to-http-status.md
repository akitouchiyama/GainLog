# 0006. 共通エラーの `code` を HTTP ステータスと 1 対 1 に対応させる

- Status: Accepted
- Date: 2026-08-23

## Context

API のエラーレスポンス形式を統一するにあたり、機械判定用の `code` フィールドの粒度をどうするかを決める必要があった。業務ごと（例：409 の「set_number 重複」と「使用中種目の削除」）に `code` を細分化するか、ステータス単位に留めるかが論点だった。

## Decision

全 API のエラーレスポンスを `{ code, message, fields? }` 構造に統一し、`code` 値を HTTP ステータスコードと 1 対 1 に対応させる。詳細は `docs/Design/Basic/common-spec.md`。

- `validation_error`(400) / `unauthorized`(401) / `forbidden`(403) / `not_found`(404) / `conflict`(409) / `internal_error`(500)
- 同一ステータス内で複数の要因がある場合も `code` は細分化せず、要因は `message`（人間向け日本語）で表現する。
- `validation_error` では `fields` 配列でフィールド単位のエラーを返す（最初の 1 件で打ち切らない）。
- OpenAPI（`openapi.yaml`）の Error スキーマもこの形式に合わせて定義済み。

## Consequences

- SPA 側は `code` を見ずに HTTP ステータスだけでも大枠のエラー種別を判定できる。`code` は UI のメッセージ出し分け・ログ突合の補助に使う。
- 業務エラーの詳細な機械判定が必要になった場合、`code` の追加ではなく別の手段（`message` パターン、専用フィールド追加）を検討することになる。
