# 0005. 認証は BFF ＋ Cookie セッション方式、allowlist ＋ `sub` 識別

- Status: Accepted
- Date: 2026-08（基本設計フェーズ）

## Context

Google OAuth 2.0 / OIDC による認証（`requirement.md` 5.6）をどう実装するかを決める必要があった。SPA が直接トークンを扱う方式と、バックエンドが仲介する方式のトレードオフ、および許可アカウントの管理方式が論点だった。

## Decision

BFF（Backend For Frontend）＋ Cookie セッション方式を採用する。詳細は `docs/Design/Basic/auth.md`。

- Hono API が OAuth クライアントの役割をすべて担い、SPA は `HttpOnly` Cookie の存在のみを意識する。SPA は Google のクライアント ID・アクセストークン・ID トークンを一切扱わない。
- セッションは D1 のサーバーサイドセッションテーブルで管理する（自己完結型 JWT は使わない）。Cookie には生トークン、DB にはそのハッシュ値を保存する。
- 有効期限はログインから 24 時間の固定（`expires_at = created_at + 24h`。アクセスによる延長・無操作タイムアウトはなし）。期限切れ行は遅延削除。
- ログイン可否は allowlist（D1 テーブル、メールアドレスで管理）で判定する。ユーザーの内部識別・記録との紐付けは Google の `sub` をキーとする。allowlist に `sub` は事前登録しない。
- Google の refresh token は保持しない。
- CSRF は SameSite ＋ Content-Type 制約 ＋ CORS 非許可 ＋ Sec-Fetch-Site 検証の多層防御とし、CSRF トークンは導入しない。

## Consequences

- XSS 発生時もトークンのブラウザ外持ち出し（別環境からの永続的ななりすまし）を防げる。ただし同一オリジンでの認証済み API 悪用リスクは残り、XSS の発生自体を防ぐ対策（フロントエンド実装）に依存する。
- 同一オリジン構成（ADR-0001）が前提。別オリジン展開や iframe 埋め込みを行う場合は CSRF 対策等の再検討が必要。
- 使用中であってもログインの24時間後には 401 となり、再ログインが必要になる。401 は SPA が一括でログイン画面へ遷移させる（`frontend.md` 5.1）。
- 所有者チェックは D1 に RLS がないためアプリコードの規律に依存する。リポジトリ層への集約・型による `userId` 必須化で機械的強制に寄せる（`auth.md` 13章 → `docs/Design/Detailed/backend.md` 6章で確定済み）。最終防御線となる統合テストの配置は `docs/Design/Detailed/test.md` 5.5・5.6 で確定済み。

## 改訂履歴

- 2026-10（詳細設計フェーズ）：セッションの有効期限を「無操作 24 時間かつ絶対 30 日」から「ログインから 24 時間の固定」に変更した。
  - 理由：単一ユーザー・低トラフィックの用途で、1 日 1 回の再ログイン（Google アカウントの選択のみ）は負担にならない。一方で、無操作判定・`last_accessed_at` 列・更新の間引き（約 5 分の誤差を許容する仕様）・それらのテストが不要になり、判定が `now > expires_at` の 1 本に単純化される。盗まれたセッションの寿命も最大 30 日から 24 時間に縮む。
  - 影響：`sessions.last_accessed_at` 列を廃止（実装前のため migration の変更は発生しない）。`auth.md` 6章、`db.md`、`backend.md` 3章 `sessionAuth`、`test.md` 5.5、`requirement.md` 受入条件を追従修正した。
