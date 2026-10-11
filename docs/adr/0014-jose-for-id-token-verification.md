# 0014. ID トークンの検証に `jose` を採用する

- Status: Accepted
- Date: 2026-09-26

## Context

Google の ID トークン検証（署名・JWKS・issuer・audience・有効期限・nonce。`auth.md` 3章）に使うライブラリの選定は、同章で「実装時に定めるものとし、本書のスコープ外とする」とされていた。

| 案 | 内容 | トレードオフ |
|---|---|---|
| **A. `jose`（採用）** | JWKS 取得・キャッシュ（`createRemoteJWKSet`）と claims 検証（`jwtVerify`）が一式揃う | 依存が1つ増える |
| B. Hono 内蔵の JWK 機能 | 追加依存なし | OIDC の ID トークン検証（nonce 等）にどこまで使えるか、JWKS キャッシュの挙動が未確認 |
| C. WebCrypto で自前実装 | 依存ゼロ | 署名検証・JWKS キャッシュ・鍵ローテーション対応を自前で書く必要があり、セキュリティ上のリスクとテストの負担が大きい |

## Decision

案 A（`jose`）を採用する。

- 一次情報で確認した内容（2026-09-26）：`jose` は Cloudflare Workers を含む Web 標準準拠ランタイムを公式にサポートする。`createRemoteJWKSet` は JWKS を自動でキャッシュする。`jwtVerify` の `issuer` オプションは `string[]` を受け付け、Google が案内する `https://accounts.google.com` と `accounts.google.com` の両方を許容できる。
- JWKS の取得先は、Google の discovery document を都度取得せず、そこに記載された安定した `jwks_uri`（`https://www.googleapis.com/oauth2/v3/certs`）を直接指定する。
- 詳細は `docs/Design/Detailed/backend.md` 5.1 章。

## Consequences

- 依存が1つ増えるため、`requirement.md` 6章（Backend）への追記と `project-structure.md` 9.4 の許可リスト更新が必要になる。
- 署名検証・JWKS キャッシュ・鍵ローテーション対応を自前で書く必要がなくなり、実装量とセキュリティ上のリスクが下がる。
- Google が `jwks_uri` を変更した場合、コードの更新が必要になる（discovery document の動的取得は行わないため）。頻度は極めて低いと見込むが、`backend.md` 15章の未解決事項として残す。
