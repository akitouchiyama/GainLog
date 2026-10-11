# 0017. E2E テストに Playwright を採用する

- Status: Accepted
- Date: 2026-10-10

## Context

GainLog は実質的に単一ユーザー・低トラフィックの個人向けアプリであり、Phase 1 の品質保証は単体テスト（Vitest）とコンポーネントテスト（Vitest ＋ React Testing Library）で成立する。E2E テストは必須ではないが、開発者が今まで触れたことのない分野であり、学習目的で導入したいという意向がある。

導入コストを検討した。

- **料金**: Playwright 自体は OSS（Apache License 2.0）で無料。本リポジトリは Public であり、GitHub Actions は Public リポジトリの標準ランナーを無料・無制限で利用できるため、CI で実行しても金銭的コストは発生しない。
- **非金銭的コスト**: ブラウザバイナリの起動を伴うため単体テストより1回あたりの実行時間が長くなる（CI の待ち時間が伸びる）。UI の DOM 構造が変わるたびにセレクタ修正が必要になりやすく、他のテストよりメンテナンスコストが高い。

料金面のコストがゼロである一方、実行時間・メンテナンスコストは学習目的で許容する判断とした。

## Decision

E2E テストに Playwright（`@playwright/test`）を採用する。

- CI に組み込む（Public リポジトリのため追加コストなし）。
- 対象シナリオ・実行タイミング・テストダブルの方針は `docs/Design/Detailed/test.md` 7章で確定した（PR ごとに CI で主要5シナリオを実行し、PR の必須チェックとする（`main` マージ時は再実行しない）。認証は ADR-0019）。
- Storybook は採用しない（`docs/Design/Detailed/frontend.md` 1章）。単独開発ではカタログ共有・デザインシステム化の価値を回収しにくく、コンポーネント単位の確認は Vitest ＋ React Testing Library に統合する。

## Consequences

- 実行時間: CI の「テスト」ステップにブラウザ起動を伴う E2E が加わり、単体テストのみの場合より所要時間が伸びる。
- メンテナンス: UI 変更時に E2E テストの修正が追加で発生する。
- 学習価値: 個人開発での技術学習という目的を優先し、Phase 1 の品質保証としての必須性より学習目的を重視した判断である。
- Phase 1 の品質保証自体は単体テスト・コンポーネントテストで成立しており、E2E が未整備でもリリース判断を妨げない。

詳細は `docs/Design/Detailed/frontend.md` 12章・`docs/Design/Detailed/test.md` 7章。
