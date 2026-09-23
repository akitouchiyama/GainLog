# 0010. 品質ゲートとツールチェーンの方針

- Status: Accepted
- Date: 2026-09-20

## Context

`main` へのマージが即本番デプロイになる（ADR-0003）ため、コミット・push・CI の各段階で機械的に品質と安全性を担保する方針が必要だった。特に、シークレットや禁止ファイルの混入防止（決定論的な検査）と、コーディング規約・セキュリティのレビュー（LLM による検査）は性質が異なるため分けて扱う。あわせて、ツールチェーンを選定する必要があった。

## Decision

### ゲートの構成

| ゲート | 内容 | 性質 |
|---|---|---|
| pre-commit（Lefthook） | gitleaks、禁止ファイルガード、lint・format・型、要件整合性チェック、migration 再作成ガード | 決定論的・ブロッキング・LLM なし |
| pre-push | `claude -p` による規約・セキュリティレビュー | **Blocker 指摘のみ push をブロック**。`--no-verify` で回避可。ドキュメントのみの push は対象外。`claude` 不在・失敗時は警告して通す（フェイルオープン） |
| CI（PR） | gitleaks（先頭の独立ジョブ）→ 通過後に lint・型・テスト・ビルド | ブロッキング。シークレットを検知したら後続を実行しない |
| CI/CD（main） | テスト → ビルド → マイグレーション → デプロイ | ADR-0003・0004 |

要件整合性チェックは、非目標キーワードの検知と技術スタック逸脱（`requirement.md` 6章にないライブラリの追加）の検知をルールベースで行い、対象の判定は許可リスト方式とする。

### ツール選定

| 項目 | 採用 | 検討した代替とトレードオフ |
|---|---|---|
| pre-push の扱い | Blocker のみブロック | 警告のみ（抑止力が弱い）／PR 時の CI で実行（ローカルの待ちは無いが手戻りが大きい） |
| Lint・format | ESLint（flat config）＋ Prettier | Biome（高速で設定が 1 つだが、React・Storybook 向けルールの網羅性とカスタム制約の表現力に不確実性がある） |
| 依存方向・Drizzle 直呼びの禁止 | tsconfig 3 分割 ＋ ESLint `no-restricted-imports`（カスタムルールは作らない） | `eslint-plugin-boundaries`・`dependency-cruiser`（表現力は高いが追加依存が増える） |
| Git フック | Lefthook | Husky ＋ lint-staged（定番だが設定が分散しやすい） |
| シークレット検出 | gitleaks（pre-commit と CI） | secretlint（npm のみで動くが、検出力は gitleaks が上） |
| パッケージマネージャ | pnpm | npm（追加導入は不要だが、宣言していない依存を参照できてしまう） |

詳細は `docs/Design/Detailed/project-structure.md` 3・9・10章。

## Consequences

- 決定論的な検査（機密・禁止ファイル）と LLM レビューを分離することで、LLM の非決定性が必須の安全装置に混入しない。
- pre-push の LLM レビューは push ごとに時間と API コストがかかり、判定が非決定的で誤検知もありうる。所要時間・コスト・プロンプトは実装フェーズで実測して調整する。
- 実際のツール整備は実装フェーズ最初のタスクで行う。CLAUDE.md には導入後に「コミット・push 前に何が走るか」を記載する（本 ADR 時点では方針のみ）。
- 要件整合性チェックの許可リスト（6章の技術名とパッケージ名の対応表）は、実装フェーズで初期内容を作成する。
