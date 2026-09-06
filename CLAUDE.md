# CLAUDE.md

GainLog プロジェクトの作業を行う際の共通コンテキスト。個人のグローバル設定（`~/.claude/CLAUDE.md`）を前提に、本リポジトリ固有の情報のみをここに記す。

## プロジェクト概要

GainLog は、日々の筋力トレーニング（種目・重量・回数・セット）を記録し、種目別の自己ベストを自動表示して成長を実感できる個人向け Web アプリケーション。実質的に単一ユーザー・低トラフィックの利用を想定する。

- 現在のフェーズ: **詳細設計**（基本設計は完了し main にマージ済み）
- Phase 1（MVP）の範囲のみを対象とする。Phase 2 機能は設計・実装しない。

## ドキュメント地図

| パス | 役割 |
|---|---|
| `docs/Requirements/requirement.md` | 要件定義書。仕様の最上位の正。スコープ・非目標・技術スタックはここが基準 |
| `docs/Design/Basic/` | 基本設計書（6種）。`db` / `screens` / `openapi.yaml` / `auth` / `architecture` / `common-spec` |
| `docs/Design/Detailed/` | 詳細設計書。`project-structure` / `backend` / `frontend` / `test`（作成中） |
| `docs/adr/` | 設計判断の記録（Architecture Decision Records） |

### 鉄則

- 設計・実装の提案や変更を行う前に、`requirement.md` と関連する `docs/Design/` の該当文書を必ず読む。未読のまま断定しない。
- 各設計書は相互参照で整合を取っている。1つを変更したら参照元・参照先の追従漏れを確認する。

## 技術スタック（`requirement.md` 6章より）

- **Backend**: TypeScript / Hono / Zod / OpenAPI / Valibot / Vitest / Drizzle ORM
- **Frontend**: TypeScript / React / TailwindCSS / Valibot / Vitest / Storybook
- **DB**: Cloudflare D1（SQLite 互換）
- **配置**: Cloudflare Workers 単一プロジェクト。React SPA を Workers Static Assets で同梱し、Hono API・D1 と同一オリジンで動作する。

> `requirement.md` 6章に明記されていないライブラリを追加する場合は、6章への追記を含めて合意を取ってから導入する。

## 主要な設計上の制約

- Cloudflare Workers / D1 の単一プロジェクト構成（モノリシック）。分散構成は取らない。
- 環境は**本番のみ**。ステージング・検証環境は設けない。ローカル開発は `wrangler dev` で本番相当を再現する。
- ブランチは `main` のみ。`feature/*` 等 → PR → `main` マージで GitHub Actions が自動デプロイ。
- 日付の基準タイムゾーンは JST（Asia/Tokyo）固定。日付表現は ISO 8601（YYYY-MM-DD）。
- 重量の単位は kg のみ（lb 非対応）。
- 認証は BFF ＋ Cookie セッション方式（`auth.md`）。SPA は Google のトークンを一切扱わない。

## 開発の進め方

- 実装は **t-wada 流の TDD**（テストファースト / Red-Green-Refactor / TODO リスト駆動 / 三角測量）で進める。詳細は `docs/Design/Detailed/test.md`。
- ディレクトリ構成は単一パッケージ（`src/api` / `src/client` / `src/shared`）を前提とする。詳細（Worker エントリポイントの配置を含む）は `docs/Design/Detailed/project-structure.md`。
- 詳細設計フェーズでは、設計書を1本ずつブランチを切って作成し PR を出す。

## Git

グローバル設定（`~/.claude/CLAUDE.md`）の Git ワークフローに従う（`git switch` 使用、ブランチ命名規則、`main` への直 push 禁止、Conventional Commits）。開発者向けの操作手順は実装着手直前に `CONTRIBUTING.md` として整備する。
