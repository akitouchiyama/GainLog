# 0011. シードとトリガー DDL は migration として管理する

- Status: Accepted
- Date: 2026-09-20

## Context

基本設計には 2 つの持ち越しがあった。

1. **事前定義種目のシードを本番へ入れる経路が未定義**。`architecture.md` 4章のシード手順（`wrangler d1 execute --local --file=./seed.sql`）はローカル用で、6章の CI にはシード工程がない。このままでは本番の D1 に事前定義種目が入らない。
2. **トリガー DDL の組み込み方法**（`db.md` 10章 未解決事項2）。drizzle-kit はトリガーを生成しないため、手書き SQL をどう管理するかを決める必要があった。

シードの選択肢は次のとおり。

| 案 | 内容 | 主なトレードオフ |
|---|---|---|
| **A. migration に含める（採用）** | 事前定義種目の `INSERT`（固定 UUID）を `--custom` の migration として管理 | 本番・ローカル・テストが同一経路。CI の既存工程だけで本番に反映される。種目の追加・変更のたびに新しい migration が必要 |
| B. `seed.sql` を別管理し、本番は手動投入 | 現行の `architecture.md` 記述に近い | 本番投入が手動運用で漏れやすく、ローカル・テストの経路が本番と分かれる |
| C. アプリ起動時に冪等 upsert | 手動工程は不要 | リクエスト経路に書き込みが混じり、Workers の起動モデルとも相性が悪い |

## Decision

- **シード**: 案 A。事前定義種目の `INSERT`（`owner_user_id` は NULL、UUID は固定リテラル）を `drizzle-kit generate --custom` で作成する migration として管理する。`seed.sql` は廃止する。種目リストの内容は `backend.md` で確定する。
- **トリガー**: `db.md` 7章の DDL を、`--custom` で作成した migration として追記型（append-only）で管理する。
- **テーブル再作成の規約**: drizzle-kit は CHECK 制約の変更などに対して、`PRAGMA foreign_keys=OFF` → 新テーブル作成 → `DROP TABLE` → RENAME という再作成 SQL を生成する（drizzle-kit 0.31.10 で実測）。これにより次のリスクがある。
  - `DROP TABLE` でトリガーが消える → 再作成を含む migration では、末尾でトリガーを再作成し、適用後にトリガーが存在することをテストで確認する。
  - D1 は FK を無効化できない（`db.md` 1章）ため、親テーブルの再作成は `ON DELETE CASCADE` の子行を消す可能性がある（D1 での実挙動は未検証）→ 親テーブルの再作成を伴う migration は原則行わず、必要な場合はデータ退避を含む手順を別途設計してローカルの実 D1 で回帰テストする。
  - 生成 SQL の見落とし → pre-commit で再作成（`__new_` / `DROP TABLE`）を検出し、`-- reviewed-rebuild: <理由>` のレビュー済みコメントがなければコミットを止める（ADR-0010）。

詳細は `docs/Design/Detailed/project-structure.md` 8章。

## Consequences

- 事前定義種目が、本番・ローカル・テストで同一経路により投入される。`architecture.md` 4章の `seed.sql` 記述は更新が必要になる。
- テストは「migration 適用後に事前定義種目が入っている」状態を前提とする（`test.md` に引き継ぐ）。
- `db.md` 5.4 の `UNIQUE(owner_user_id, name)` は NULL 同士の重複を防げないため、migration の内容とテストで事前定義種目の名前重複がないことを担保する。
- Drizzle の `text('category', { enum })` は DB の `CHECK` を生成しない（実測）。`db.md` の `CHECK` は `check()` で明示的に定義し、生成 SQL との突合テストを用意する。
- ADR-0004 の「後方互換な変更に限定する」方針を、上記の規約で具体化する。drizzle-kit 1.0 系（現在 rc）はマイグレーションの配置形式が変わるため、GA 後の移行時に本 ADR と `project-structure.md` 8.1 を更新する。
