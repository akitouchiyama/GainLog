# 0019. E2E の認証はセッションの直接投入で用意する

- Status: Accepted
- Date: 2026-10-10

## Context

E2E テスト（Playwright。ADR-0017）は実際の Google ログインを通せない。認証済みの状態をどう用意するかを決める必要があった。制約は次のとおり。

- 認証は BFF ＋ Cookie セッション方式で、セッションは `sessions` 表（`id` は生トークンの SHA-256 の16進数ハッシュ）が正本である（ADR-0005、`db.md` 5.2）。
- Cookie は `__Host-session`（HttpOnly・Secure・SameSite=Lax・Path=/・Domain なし）。
- 環境は本番のみで、本番コードにテスト専用の経路が紛れ込むリスクを持ちたくない（ADR-0002）。

## Decision

| 選択肢 | 内容 | 評価 |
|---|---|---|
| **A. DB にセッションを直接投入（採用）** | テストごとにローカル D1 へ users／sessions を INSERT し、生トークンを `__Host-session` Cookie として注入する | 本番コードに分岐・エンドポイントを一切追加しない。実際のセッション検証の経路を通る。D1 への書き込み手段（`wrangler d1 execute --local`）が必要 |
| B. テスト専用のログイン API | 環境変数で有効化するエンドポイントを用意 | E2E は楽だが、本番に紛れ込むリスクが生じ、厳重なガードが要る |
| C. モック IdP を立てる | 偽の Google（認可・トークン・JWKS）をローカルで起動 | 最も本物に近いが、構築・維持のコストが大きい |

**A を採用する。** OAuth フロー自体（state・nonce・ID トークン検証・allowlist）は E2E では検証せず、API 統合テストで `IdTokenVerifier`・`GoogleOAuthClient` の fake を使って担保する。「実際の Google ログイン」は手動確認手順に置く（`test.md` 12.3）。

## Consequences

- 本番コード・本番設定にテストのための変更は不要。
- E2E は各テストが専用のユーザーを作るため、実行順序に依存しない。
- `__Host-` Cookie が `http://localhost` で受理されるか、`wrangler d1 execute --local` の書き込みが起動中のサーバーから見えるかは未確認で、実装フェーズ最初のタスクで実測する（`test.md` 15章）。成立しない場合は、事前投入や `https` でのローカル起動を検討する。
- 受入条件「実際の Google でログインできる」は自動テストで検証できず、手動確認に依存する。

詳細は `docs/Design/Detailed/test.md` 7.2。
