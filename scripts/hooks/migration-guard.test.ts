import { describe, expect, it } from 'vitest'
import { checkMigration } from './migration-guard.ts'

const MARK = '-- reviewed-rebuild: CHECK 制約の変更。トリガーは末尾で再作成'

/** 新規ファイル（全行が追加行）として検査する */
const checkNew = (sql: string, path = 'migrations/0003_x.sql') =>
  checkMigration({ path, content: sql, addedLines: sql.split('\n') })

const REBUILD_CHILD = [
  'PRAGMA foreign_keys=OFF;',
  'CREATE TABLE `__new_workout_sets` (`id` text PRIMARY KEY NOT NULL);',
  'INSERT INTO `__new_workout_sets`("id") SELECT "id" FROM `workout_sets`;',
  'DROP TABLE `workout_sets`;',
  'ALTER TABLE `__new_workout_sets` RENAME TO `workout_sets`;',
  'PRAGMA foreign_keys=ON;',
].join('\n')

describe('checkMigration', () => {
  it('再作成を含まない SQL は通す', () => {
    expect(
      checkNew(
        'ALTER TABLE `exercises` ADD `note` text;\nCREATE INDEX `i` ON `x` (`a`);',
      ),
    ).toEqual([])
  })

  it('DROP TABLE を含み印がなければ拒否する', () => {
    const [v, ...rest] = checkNew('DROP TABLE `workout_sets`;')
    expect(v?.reason).toContain('reviewed-rebuild')
    expect(rest).toEqual([])
  })

  it('__new_ を含み印がなければ拒否する', () => {
    expect(
      checkNew('CREATE TABLE `__new_workout_sets` (`id` text);'),
    ).toHaveLength(1)
  })

  it('先頭に印があれば子テーブルの再作成は通す', () => {
    expect(checkNew(`${MARK}\n${REBUILD_CHILD}`)).toEqual([])
  })

  it('先頭の空行は飛ばして印を探す', () => {
    expect(checkNew(`\n\n${MARK}\n${REBUILD_CHILD}`)).toEqual([])
  })

  it('印の理由が空なら拒否する', () => {
    expect(checkNew(`-- reviewed-rebuild:   \n${REBUILD_CHILD}`)).toHaveLength(
      1,
    )
  })

  it('印が先頭になければ拒否する', () => {
    expect(
      checkNew(`PRAGMA foreign_keys=OFF;\n${MARK}\n${REBUILD_CHILD}`),
    ).toHaveLength(1)
  })

  it.each([
    'DROP TABLE `users`;',
    'DROP TABLE "exercises";',
    'drop table workout_records;',
    'DROP TABLE IF EXISTS `users`;',
    'DROP  TABLE\t`workout_records`;',
  ])('親テーブルの DROP は印があっても拒否する: %s', (stmt) => {
    const [v, ...rest] = checkNew(`${MARK}\n${stmt}`)
    expect(v?.reason).toContain('親テーブル')
    expect(rest).toEqual([])
  })

  it('親テーブル名で始まるだけの別テーブルは親として扱わない', () => {
    expect(checkNew(`${MARK}\nDROP TABLE \`users_backup\`;`)).toEqual([])
  })

  it('印がなく親テーブルを DROP する場合は親テーブルの違反として報告する', () => {
    const result = checkNew('DROP TABLE `users`;')
    expect(result.some((v) => v.reason.includes('親テーブル'))).toBe(true)
  })

  it('SQL コメント内の DROP TABLE・__new_ は対象外', () => {
    expect(
      checkNew(
        '-- DROP TABLE `users` はしないこと\nSELECT 1; -- __new_ の話\n',
      ),
    ).toEqual([])
  })

  it.each([
    'migrations/meta/0003_snapshot.json',
    'migrations/sub/0001.sql',
    'src/x.sql',
  ])('migrations/ 直下の *.sql 以外は対象外: %s', (path) => {
    expect(checkNew('DROP TABLE `users`;', path)).toEqual([])
  })

  it('追加された行だけを検査する', () => {
    const content = 'DROP TABLE `workout_sets`;\nSELECT 1;'
    expect(
      checkMigration({
        path: 'migrations/0003_x.sql',
        content,
        addedLines: ['SELECT 1;'],
      }),
    ).toEqual([])
  })
})
