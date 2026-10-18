import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);
let ready;

// ستون‌های خروجی (due_date به‌صورت رشته YYYY-MM-DD برگردانده می‌شود)
export const COLS = `id, title, done, priority, category, created_at, completed_at,
  to_char(due_date, 'YYYY-MM-DD') AS due_date`;

// جدول و ستون‌های جدید در اولین درخواست خودکار ساخته/اضافه می‌شوند
// (دیتابیس قبلی هم بدون از دست رفتن اطلاعات ارتقا پیدا می‌کند)
export function db() {
  ready ??= (async () => {
    const steps = [
      `CREATE TABLE IF NOT EXISTS todos (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        done BOOLEAN NOT NULL DEFAULT false,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        completed_at TIMESTAMPTZ
      )`,
      `ALTER TABLE todos ADD COLUMN IF NOT EXISTS priority SMALLINT NOT NULL DEFAULT 2`,
      `ALTER TABLE todos ADD COLUMN IF NOT EXISTS category TEXT`,
      `ALTER TABLE todos ADD COLUMN IF NOT EXISTS due_date DATE`,
    ];
    for (const s of steps) await sql.query(s);
  })().catch((e) => { ready = undefined; throw e; });
  return ready.then(() => sql);
}
