# 0018. テスト実行基盤に `@cloudflare/vitest-plugin`・jsdom／RTL・MSW を採用する

- Status: Accepted
- Date: 2026-10-10

## Context

`test.md` で、API（Workers＋D1）・クライアント（React SPA）・shared のテスト実行基盤を選ぶ必要があった。前提は次のとおり。

- D1 はモックせず、ローカルの実 D1 に migration（シード・トリガーを含む）を適用してテストする（ADR-0011）。
- 開発は t-wada 流 TDD で、速いフィードバックが要る（`CLAUDE.md`）。
- Vitest は api／client／shared の3プロジェクトに分け、Worker 用プラグインを client・shared に読み込ませない（`project-structure.md` 6.3）。

2026-10-10 の npm（`npm view`）・公式ドキュメントで確認した事実：

- `@cloudflare/vitest-pool-workers` の最新は 0.23.0（peer: `vitest ^4.1.0`、依存 wrangler 4.124.0）。公式ドキュメントは同パッケージから `@cloudflare/vitest-plugin` への移行ガイドを案内し、後継は「package API と Vitest 設定は変更なし」とある。
- `@cloudflare/vitest-plugin` 1.4.0（2026-10-08 公開）の peer は `vitest ^4.1.0 || ^5.0.0`、依存 wrangler は 4.149.0（`@cloudflare/vite-plugin` 1.63.1 の peer `wrangler ^4.149.0` と一致）。
- 公式ドキュメントで確認できなかった事項：D1 のテスト間ストレージ分離の挙動、カバレッジ（v8／istanbul）への対応、Vitest 5 での実動作。

## Decision

**API のテスト**は `@cloudflare/vitest-plugin`（＋ Vitest 5）で workerd 上のローカル D1 に対して実行する。

| 領域 | 選択肢 | 評価 |
|---|---|---|
| API の実行環境 | **A. `@cloudflare/vitest-plugin`（採用）** | 本番と同じ workerd・D1 で動く。migration を本番と同一の SQL で適用できる。後継として公式が移行先に位置づけている。新しく、Vitest 5 での動作・カバレッジ対応は未確認 |
| | B. `@cloudflare/vitest-pool-workers` 0.23.0 | 旧名称で、移行が前提。wrangler の依存版が `@cloudflare/vite-plugin` の peer と食い違う |
| | C. Node ＋ SQLite 直結（better-sqlite3 等） | 高速だが、D1／workerd 固有の挙動（`batch`・エラー形式）とずれる可能性があり、本番で初めて分かる不具合を残す |
| | D. リポジトリは C、ルート統合だけ A | 設定が2系統になり、DB の挙動が層ごとに異なる |
| クライアントの DOM 環境 | **jsdom（採用）** ＋ React Testing Library ＋ `user-event` ＋ `jest-dom` | 事実上の標準で、情報量が多い。`<dialog>` の `showModal()` の対応は未確認で、未対応ならスタブか E2E に寄せる |
| クライアントの API 差し替え | **MSW（`msw/node`）（採用）** | `hc`／`unwrap`／TanStack Query を含む本物の経路を通せる。依存が1つ増える |
| | `fetch` を直接スタブ | 依存は増えないが、レスポンスの組み立てがテストごとに散らばる |
| | フックを単体テストしない | 401 の横断処理・invalidate の検証が E2E に偏る |
| Worker 内の外向き通信 | `@msw/cloudflare` は**採用しない** | Google への呼び出しは `GoogleOAuthClient`・`IdTokenVerifier` の fake で差し替えるため不要 |

- Vitest は 5 系を採用する。**動作が成立しない場合は 4.1 系に落とす**（`@cloudflare/vitest-plugin` の peer の範囲内）。
- `vitest.config.ts` は `vite.config.ts` を継承せず独立に定義し、client・shared に Cloudflare プラグインを読み込ませない。
- D1 のストレージ分離に依存せず、各テストが自分専用のユーザー・データを作る規約でテストを成立させる。

## Consequences

- 本番と同じランタイム・同じ migration でテストされ、トリガー・CHECK・RESTRICT の挙動を実 D1 で検証できる。
- 実装前の技術検証（2026-10-12）で実測した（`test.md` 15章）。Vitest 5.0.3 のまま動作し、カバレッジは v8・istanbul とも workerd 上のコードを計測できたため v8 に確定した。D1 のストレージはテストファイル単位で分離される。jsdom は `<dialog>` の `showModal()`・`close()` を実装していないため、setup の最小スタブと E2E で補う。msw 3 では未処理リクエストの設定が `onUnhandledFrame` に改名されている。
- 追加依存（`@cloudflare/vitest-plugin`・`jsdom`・RTL 系・`msw`・`@vitest/coverage-*`）は `requirement.md` 6章に追記する。
- wrangler・`@cloudflare/vite-plugin`・`@cloudflare/vitest-plugin` は依存が連動するため、単一の版に解決されることを確認する（`pnpm why wrangler`）。

詳細は `docs/Design/Detailed/test.md` 4・6・8章。
