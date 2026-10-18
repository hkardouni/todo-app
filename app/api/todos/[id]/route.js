import { db, COLS } from '@/lib/db';

export async function PATCH(req, { params }) {
  const { id } = await params;
  const b = await req.json();
  const sets = [], vals = [id];
  const add = (col, v, cast = '') => { vals.push(v); sets.push(`${col} = $${vals.length}${cast}`); };

  if ('title' in b) {
    if (!b.title?.trim()) return Response.json({ error: 'title required' }, { status: 400 });
    add('title', b.title.trim());
  }
  if ('description' in b) add('description', b.description?.trim() || null);
  if ('priority' in b) add('priority', [1, 2, 3].includes(+b.priority) ? +b.priority : 2);
  if ('category' in b) add('category', b.category?.trim() || null);
  if ('due_date' in b) add('due_date', b.due_date || null, '::date');
  if ('done' in b) { add('done', !!b.done); sets.push(`completed_at = ${b.done ? 'now()' : 'NULL'}`); }
  if (!sets.length) return Response.json({ error: 'nothing to update' }, { status: 400 });

  const sql = await db();
  const [row] = await sql.query(`UPDATE todos SET ${sets.join(', ')} WHERE id = $1 RETURNING ${COLS}`, vals);
  return Response.json(row);
}

export async function DELETE(_req, { params }) {
  const { id } = await params;
  const sql = await db();
  await sql.query('DELETE FROM todos WHERE id = $1', [id]);
  return Response.json({ ok: true });
}
