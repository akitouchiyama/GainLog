# 0013. `src/api` の内部構成にオニオンアーキテクチャを採用する

- Status: Accepted
- Date: 2026-09-26

## Context

`src/api` 内部のレイヤー構成（`auth.md` 13章「詳細設計で確定する項目」）を決める必要があった。基本設計では「ルート → サービス → リポジトリ」の3層が例示されていたが、詳細設計（`backend.md`）でディレクトリ・依存方向まで確定するにあたり、単純なレイヤードアーキテクチャのままにするか、依存性逆転を伴うオニオンアーキテクチャにするかが論点だった。

| 案 | 内容 | トレードオフ |
|---|---|---|
| A. レイヤード（3層、依存性逆転なし） | routes → services（任意）→ repositories を上から下へ具象のまま依存 | シンプルだが、`domain` に相当する層が独立しないため、Drizzle 型がハンドラ側まで漏れやすい |
| **B. オニオン（採用）** | domain（中心）を repositories 等のインターフェース（ports）だけが置かれる層とし、interface/infrastructure が domain に依存する形に反転させる | domain が外部ライブラリから独立し、テスト時の差し替えが容易。層とディレクトリが増える |

## Decision

案 B（オニオンアーキテクチャ）を採用する。

- 中心に `domain`（モデル・ドメインエラー・ports）を置き、`application`（複数リポジトリにまたがるユースケースのみ）・`infrastructure`（ports の実装）・`interface`（Hono のルート・ミドルウェア・composition root）がいずれも `domain` に依存する。
- `application` は「複数のリポジトリ／ポートにまたがる処理」にのみ使い、単純な CRUD は `interface` から `domain/ports` のリポジトリ型を直接呼ぶ（Phase 1 では `CompleteLoginUseCase`・`AddExerciseBlockUseCase` の2つのみ）。過剰な抽象化を避けるための線引きとする。
- 詳細は `docs/Design/Detailed/backend.md` 2章。

## Consequences

- `domain` が `drizzle-orm`・`jose` 等の外部依存を持たないため、リポジトリテストと異なり、ユースケースの単体テストではポートをテストダブルに差し替えられる（`test.md` へ引き継ぐ）。
- ディレクトリ数・インターフェース定義（ports）が増え、単純な CRUD だけを見ても「domain のインターフェース」と「infrastructure の実装」の2ファイルに分かれる。実質1人の開発規模でこの複雑さが見合うかは、実装を進める中で判断する（過剰であれば `application` の線引きを緩めることはあっても、層自体を減らす想定はしていない）。
- `no-restricted-imports` による依存方向の強制ルールが1段階複雑になる（`backend.md` 2.4）。
