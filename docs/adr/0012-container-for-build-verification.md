# 0012. 開発は WSL 上で行い、ビルド成果物の確認に Podman のコンテナを使う

- Status: Accepted
- Date: 2026-09-23

## Context

ローカル開発環境をどう構成するかを決める必要があった。前提は次のとおり。

- 開発者は 1 人・1 マシン（Windows ＋ WSL2）。Node は WSL 上の nvm で導入済み。
- Git フック（Lefthook の pre-commit・pre-push）で ESLint・`tsc`・gitleaks・`claude -p` を実行する（ADR-0010）。
- Claude Code は WSL 上で動き、テスト・lint 等のコマンドを実行する。
- コンテナ対応を、スキル（再現可能な環境構築）として示したい。

選択肢は次の 3 つだった。

| 案 | 内容 | 主なトレードオフ |
|---|---|---|
| A. WSL に直接導入のみ | 現状の設計どおり | 最も手間が少ない。プロジェクト外に増えるのは gitleaks と pnpm のキャッシュ程度。コンテナ対応は示せない |
| B. Dev Container で開発 | エディタ・ターミナルをコンテナ内で使う | 環境を完全に使い捨てにできる。Git フック・`claude -p`・Claude Code の実行経路をすべてコンテナ対応させる必要があり、VS Code 拡張か devcontainer CLI も要る |
| **C. 開発は WSL、ビルド成果物の確認はコンテナ（採用）** | 日常の開発は A、アプリの確認だけをコンテナで行う | フック等の経路は変えずに、lockfile から再現できることを示せる。起動方法が 2 通り（`pnpm dev` とコンテナ）になる |

## Decision

案 C を採用する。

- 日常の開発（編集・`pnpm dev`・テスト・lint・型・Git フック・`claude -p`）は WSL 上で行う。
- `Containerfile`（Debian 系 Node イメージ、多段ビルド）と `compose.yaml` を置き、`podman-compose` で起動する。コンテナは lockfile から依存を入れて `vite build` し、ローカル D1 に migration を適用して `vite preview` で配信する。ソースはマウントしない。
- PR の CI でイメージのビルドを検証する。

詳細は `docs/Design/Detailed/project-structure.md` 6.4・9.5。

## Consequences

- Git フック・pre-push の LLM レビュー・Claude Code の実行経路はコンテナの影響を受けない。
- コンテナは開発サーバ（HMR）を提供しないため、ホストの `pnpm dev` と役割が重ならない。
- 本番は Workers でありコンテナではない。コンテナで得られるのは「クリーンな環境で lockfile から再現できること」の確認であり、本番相当の度合いはホストの workerd と同じである。
- Alpine は workerd が非対応のため使えない。
- `requirement.md` 6章に Podman・podman-compose を追記する（npm 依存ではないため 9.4 の許可リストの対象外）。
- `vite preview` の origin も OAuth の redirect URI として登録が必要になる。
- 未確認事項は実装前の技術検証（2026-10-12）で確認した。`vite preview` はビルド時に生成される `dist/gainlog/.dev.vars` を読むため、`.dev.vars` はそこへ読み取り専用でマウントする。rootless Podman の警告は出ず影響はなかった。GitHub Actions の `ubuntu-24.04` ランナーには Podman 4.9.3 が導入されている（実地確認は CI の構築時）。ホストに `.dev.vars` がないと Podman が空のディレクトリを作るため、起動前に存在を確認する（`project-structure.md` 6.4）。
