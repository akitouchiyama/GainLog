// 検証用の暫定スキーマ（feature/project-bootstrap）。
// 機能実装時に db.md の全 6 テーブルへ置き換える。
import { sql } from 'drizzle-orm'
import { check, integer, sqliteTable, text, unique } from 'drizzle-orm/sqlite-core'

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  googleSub: text('google_sub').notNull().unique(),
  email: text('email').notNull(),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
})

export const workoutRecords = sqliteTable(
  'workout_records',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    workoutDate: text('workout_date').notNull(),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (t) => [
    unique().on(t.userId, t.workoutDate),
    check(
      'workout_records_date_format',
      sql`${t.workoutDate} GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'`,
    ),
  ],
)

export const workoutSets = sqliteTable(
  'workout_sets',
  {
    id: text('id').primaryKey(),
    workoutRecordId: text('workout_record_id')
      .notNull()
      .references(() => workoutRecords.id, { onDelete: 'cascade' }),
    // exercises は E で追加する。ここでは FK なしの TEXT
    exerciseId: text('exercise_id').notNull(),
    setNumber: integer('set_number').notNull(),
    weightDeci: integer('weight_deci').notNull(),
    reps: integer('reps').notNull(),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (t) => [
    unique().on(t.workoutRecordId, t.exerciseId, t.setNumber),
    check('workout_sets_set_number_min', sql`${t.setNumber} >= 1`),
    check('workout_sets_weight_deci_range', sql`${t.weightDeci} BETWEEN 0 AND 9999`),
    check('workout_sets_reps_min', sql`${t.reps} >= 1`),
  ],
)
