import { db, COLS } from '@/lib/db';

const prio = (v) => ([1, 2, 3].includes(+v) ? +v : 2);

export async function GET(req) {
  const sql = await db();
  const p = new URL(req.url).searchParams;
  const status = p.get('status') || 'active'; // active | done | all
  const conds = [], vals = [];
  const add = (cond, v) => { vals.push(v); conds.push(cond.replace('?', '$' + vals.length)); };

  if (status === 'active') conds.push('done = false');
  if (status === 'done') conds.push('done = true');
  if (p.get('q')) { // جستجو در عنوان و توضیحات
    vals.push(`%${p.get('q')}%`);
    const i = vals.length;
    conds.push(`(title ILIKE $${i} OR description ILIKE $${i})`);
  }
  if (p.get('category')) add('category = ?', p.get('category'));
  if (p.get('priority')) add('priority = ?', prio(p.get('priority')));

  // فیلتر تاریخ روی یکی از: ثبت / انجام / موعد
  const field = { created: 'created_at', completed: 'completed_at', due: 'due_date' }[p.get('dateField')] || 'created_at';
  if (p.get('from')) add(`${field} >= ?::date`, p.get('from'));
  if (p.get('to')) add(`${field} < (?::date + 1)`, p.get('to'));

  const order = {
    created: 'created_at DESC',
    due: 'due_date NULLS LAST, priority',
    priority: 'priority, due_date NULLS LAST, created_at DESC',
    completed: 'completed_at DESC NULLS LAST',
  }[p.get('sort')] || (status === 'done' ? 'completed_at DESC NULLS LAST' : 'done, due_date NULLS LAST, priority, created_at DESC');

  const where = conds.length ? 'WHERE ' + conds.join(' AND ') : '';
  const rows = await sql.query(`SELECT ${COLS} FROM todos ${where} ORDER BY ${order} LIMIT 500`, vals);
  return Response.json(rows);
}

export async function POST(req) {
  const b = await req.json();
  if (!b.title?.trim()) return Response.json({ error: 'title required' }, { status: 400 });
  const sql = await db();
  const [row] = await sql.query(
    `INSERT INTO todos (title, description, priority, category, due_date) VALUES ($1, $2, $3, $4, $5::date) RETURNING ${COLS}`,
    [b.title.trim(), b.description?.trim() || null, prio(b.priority), b.category?.trim() || null, b.due_date || null]
  );
  return Response.json(row, { status: 201 });
}
