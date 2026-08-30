# 0001. Cloudflare Workers 単一プロジェクトのモノリシック構成

- Status: Accepted
- Date: 2026-08（基本設計フェーズ）

## Context

GainLog は実質 1 ユーザー・低トラフィックの個人利用アプリである。フロントエンド（React SPA）・バックエンド API・DB をどう配置するかを決める必要があった。ホスティング費用を抑えたい、運用をシンプルにしたい、という制約がある。

## Decision

Cloudflare の単一プロジェクトに、フロントエンド・バックエンド API（Hono）・DB（Cloudflare D1）を同梱するモノリシック構成をとる。

- React SPA は Workers Static Assets により配信し、Hono API・D1 と同一オリジン・同一 Worker で動作させる。
- パスベースのルーティングで `/api/*` を Hono に、それ以外を Static Assets（SPA、`index.html` フォールバック）に振り分ける。
- Hono を採用する理由は、Cloudflare Workers ランタイムを公式に最も密接にサポートしているため。

詳細は `docs/Design/Basic/architecture.md`。

## Consequences

- 無料枠（Workers 10 万 req/日、D1 5GB storage 等）の範囲内で運用できる見込み。
- 同一オリジン構成のため、認証で CORS の複雑さを回避できる（ADR-0005 の前提）。
- D1 は SQLite ベースのため、PostgreSQL 固有機能（JSONB 等）は使えない。必要になった場合は Workers を維持したまま Neon 等へ移行する選択肢を残す。
- スケールアウトが必要な規模になった場合は構成の見直しが必要（現前提では想定しない）。
