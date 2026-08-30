# 0005. 認証は BFF ＋ Cookie セッション方式、allowlist ＋ `sub` 識別

- Status: Accepted
- Date: 2026-08（基本設計フェーズ）

## Context

Google OAuth 2.0 / OIDC による認証（`requirement.md` 5.6）をどう実装するかを決める必要があった。SPA が直接トークンを扱う方式と、バックエンドが仲介する方式のトレードオフ、および許可アカウントの管理方式が論点だった。

## Decision

BFF（Backend For Frontend）＋ Cookie セッション方式を採用する。詳細は `docs/Design/Basic/auth.md`。

- Hono API が OAuth クライアントの役割をすべて担い、SPA は `HttpOnly` Cookie の存在のみを意識する。SPA は Google のクライアント ID・アクセストークン・ID トークンを一切扱わない。
- セッションは D1 のサーバーサイドセッションテーブルで管理する（自己完結型 JWT は使わない）。Cookie には生トークン、DB にはそのハッシュ値を保存する。
- 有効期限は「無操作 24 時間」かつ「絶対 30 日」。期限切れ行は遅延削除。
- ログイン可否は allowlist（D1 テーブル、メールアドレスで管理）で判定する。ユーザーの内部識別・記録との紐付けは Google の `sub` をキーとする。allowlist に `sub` は事前登録しない。
- Google の refresh token は保持しない。
- CSRF は SameSite ＋ Content-Type 制約 ＋ CORS 非許可 ＋ Sec-Fetch-Site 検証の多層防御とし、CSRF トークンは導入しない。

## Consequences

- XSS 発生時もトークンのブラウザ外持ち出し（別環境からの永続的ななりすまし）を防げる。ただし同一オリジンでの認証済み API 悪用リスクは残り、XSS の発生自体を防ぐ対策（フロントエンド実装）に依存する。
- 同一オリジン構成（ADR-0001）が前提。別オリジン展開や iframe 埋め込みを行う場合は CSRF 対策等の再検討が必要。
- 所有者チェックは D1 に RLS がないためアプリコードの規律に依存する。リポジトリ層への集約・型による `userId` 必須化・統合テストで機械的強制に寄せる（`auth.md` 13章 → `backend.md` / `test.md` で確定）。
