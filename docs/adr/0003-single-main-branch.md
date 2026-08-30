# 0003. ブランチは main のみ（develop なし）とし、マージで自動デプロイ

- Status: Accepted
- Date: 2026-08-30

## Context

詳細設計に入るにあたり、`develop` ブランチや Git Flow 的な運用を導入すべきか検討した。個人開発であり、リリースを束ねる必要も、複数人の変更を統合するタイミング制御も現状は不要である。

## Decision

長期ブランチは `main` のみとする。

- 作業は `feature/` `fix/` `docs/` 等のプレフィックス付き短命ブランチで行い、PR 経由で `main` にマージする。
- `main` への直接 commit / push は禁止。
- `main` へのマージをトリガーに GitHub Actions が「テスト（Vitest）→ マイグレーション適用 → `wrangler deploy`」を自動実行する（`docs/Design/Basic/architecture.md` 6章）。
- テスト失敗時はデプロイを中断する。

## Consequences

- ブランチ運用がシンプルで、`main` が常にデプロイ可能な状態を表す。
- リリースのタイミングを調整する仕組みがない（マージ＝即本番）。緊急時は PR を止める、もしくは revert で対応する。
- 開発者向けのブランチ運用手順は実装着手直前に `CONTRIBUTING.md` として明文化する。
