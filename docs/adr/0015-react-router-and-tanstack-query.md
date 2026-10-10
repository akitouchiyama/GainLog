# 0015. SPA のルーティングとサーバー状態管理に React Router と TanStack Query を採用する

- Status: Accepted
- Date: 2026-09-27

## Context

`src/client`（React SPA）で、クライアントサイドルーティング（`screens.md` 4章「ライブラリの具体的な選定は実装時に定める」）と、API データの取得・キャッシュ・更新後の再取得（`project-structure.md` 4.5 で引き継がれた「フロントの状態管理」）をどう実装するかを決める必要があった。

### ルーティング

| 案 | 内容 | トレードオフ |
|---|---|---|
| **A. React Router（宣言型。採用）** | `<BrowserRouter>`/`<Routes>`/`<Route>` による宣言的なルート定義。History API ベース | 情報量が多く学習コストが低い。データ取得（loader/action）は使わずナビゲーションのみに使う |
| B. TanStack Router | ルート・検索パラメータまで型安全。TanStack Query と親和性が高い | 概念が多く、Phase 1（画面5つ）の規模には過剰。学習コストが高い |
| C. wouter 等の軽量ルーター | バンドル最小。FCP目標に有利 | 機能・情報が少なく、認証ガード等を自前で書く部分が増える |

### サーバー状態管理

| 案 | 内容 | トレードオフ |
|---|---|---|
| **A. TanStack Query（採用）** | キャッシュ・再取得・ミューテーション後の invalidate・401の一括検知（`QueryCache`/`MutationCache` の `onError`）を標準機能で提供 | 依存が1つ増える |
| B. 自前フック（`fetch` + `useEffect`） | 依存を増やさない | キャッシュ競合（古いレスポンスの上書き）・再取得・ローディング状態を自前実装する必要があり、TDD の対象コードが増える |
| C. SWR | 軽量にキャッシュ・再検証を提供 | ミューテーション周りは TanStack Query より手薄 |

## Decision

ルーティングは案 A（React Router、宣言型の使い方のみ）、サーバー状態管理は案 A（TanStack Query）を採用する。

- React Router は `react-router` パッケージ（v7 以降、旧 `react-router-dom` の機能を統合）を使い、データルーター API（loader/action）は使わない。データ取得は TanStack Query に一本化する。
- TanStack Query の `QueryCache`/`MutationCache` の `onError` フックで、全 API 呼び出しの 401 を横断的に検知し、`queryClient.clear()` ＋ ログイン画面遷移を行う（`docs/Design/Detailed/frontend.md` 5章）。
- 各ミューテーション成功後の invalidate 対象は `frontend.md` 5.3 の対応表で定める。

詳細は `docs/Design/Detailed/frontend.md` 3章・5章。

## Consequences

- ルーティングとサーバー状態管理の責務が分離される（React Router はナビゲーションのみ、データはすべて TanStack Query 経由）。将来 TanStack Router へ移行する場合も、データ取得ロジック（`features/*/use*.ts`）への影響は小さい。
- 依存が2つ増える（`requirement.md` 6章へ追記）。
- API のレスポンス型（Hono RPC）とキャッシュ管理（TanStack Query）が別レイヤーになるため、`lib/api.ts` の `ApiError` 正規化（`frontend.md` 4.2）が両者をつなぐ重要な薄いレイヤーになる。
