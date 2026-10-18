import { db } from '@/lib/db';

export async function GET() {
  const sql = await db();
  const rows = await sql.query('SELECT DISTINCT category FROM todos WHERE category IS NOT NULL ORDER BY 1');
  return Response.json(rows.map((r) => r.category));
}
