'use client';
import { useEffect, useState, useCallback } from 'react';

const PRIO = { 1: 'بالا', 2: 'متوسط', 3: 'پایین' };
const today = () => new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD به وقت محلی
const fa = (d) => new Date(d.length === 10 ? d + 'T12:00:00' : d).toLocaleDateString('fa-IR', { dateStyle: 'medium' });
const emptyNew = { title: '', priority: '2', category: '', due_date: '' };

async function api(url, method, body) {
  return fetch(url, { method, body: body && JSON.stringify(body) });
}

export default function Home() {
  const [todos, setTodos] = useState([]);
  const [cats, setCats] = useState([]);
  const [n, setN] = useState(emptyNew);
  const [f, setF] = useState({ status: 'active', q: '', category: '', priority: '', dateField: 'created', from: '', to: '', sort: '' });
  const [loading, setLoading] = useState(true);
  const [edit, setEdit] = useState(null); // { id, title, priority, category, due_date }

  const load = useCallback(async () => {
    const qs = new URLSearchParams(Object.entries(f).filter(([, v]) => v));
    const [r, c] = await Promise.all([fetch('/api/todos?' + qs), fetch('/api/categories')]);
    if (r.ok) setTodos(await r.json());
    if (c.ok) setCats(await c.json());
    setLoading(false);
  }, [f]);

  useEffect(() => { const t = setTimeout(load, 250); return () => clearTimeout(t); }, [load]);

  async function add(e) {
    e.preventDefault();
    if (!n.title.trim()) return;
    await api('/api/todos', 'POST', n);
    setN({ ...emptyNew, priority: n.priority, category: n.category }); // دسته و اولویت برای کار بعدی حفظ می‌شود
    load();
  }
  async function toggle(t) { await api(`/api/todos/${t.id}`, 'PATCH', { done: !t.done }); load(); }
  async function remove(t) {
    if (!confirm('این کار برای همیشه حذف شود؟')) return;
    await api(`/api/todos/${t.id}`, 'DELETE');
    load();
  }
  async function saveEdit(e) {
    e.preventDefault();
    const { id, ...body } = edit;
    if (!body.title.trim()) return;
    await api(`/api/todos/${id}`, 'PATCH', body);
    setEdit(null);
    load();
  }
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const setNew = (k) => (e) => setN({ ...n, [k]: e.target.value });
  const setEd = (k) => (e) => setEdit({ ...edit, [k]: e.target.value });
  const t0 = today();

  return (
    <main>
      <h1>📝 کارهای من</h1>

      <datalist id="cats">{cats.map((c) => <option key={c} value={c} />)}</datalist>

      <form className="add-form" onSubmit={add}>
        <div className="row">
          <input type="text" placeholder="کار جدید…" value={n.title} onChange={setNew('title')} />
          <button className="primary">افزودن</button>
        </div>
        <div className="row">
          <select value={n.priority} onChange={setNew('priority')} title="اولویت">
            {Object.entries(PRIO).map(([k, v]) => <option key={k} value={k}>اولویت {v}</option>)}
          </select>
          <input type="text" list="cats" placeholder="دسته‌بندی" value={n.category} onChange={setNew('category')} />
          <input type="date" value={n.due_date} onChange={setNew('due_date')} title="موعد انجام" />
        </div>
      </form>

      <div className="filters">
        <label>نمایش
          <select value={f.status} onChange={set('status')}>
            <option value="active">انجام‌نشده‌ها</option>
            <option value="done">انجام‌شده‌ها</option>
            <option value="all">همه</option>
          </select>
        </label>
        <label className="grow">جستجو در عنوان
          <input type="search" value={f.q} onChange={set('q')} placeholder="بخشی از عنوان…" />
        </label>
        <label>دسته‌بندی
          <select value={f.category} onChange={set('category')}>
            <option value="">همه</option>
            {cats.map((c) => <option key={c}>{c}</option>)}
          </select>
        </label>
        <label>اولویت
          <select value={f.priority} onChange={set('priority')}>
            <option value="">همه</option>
            {Object.entries(PRIO).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </label>
        <label>فیلتر تاریخ بر اساس
          <select value={f.dateField} onChange={set('dateField')}>
            <option value="created">تاریخ ثبت</option>
            <option value="completed">تاریخ انجام</option>
            <option value="due">موعد</option>
          </select>
        </label>
        <label>از <input type="date" value={f.from} onChange={set('from')} /></label>
        <label>تا <input type="date" value={f.to} onChange={set('to')} /></label>
        <label>مرتب‌سازی
          <select value={f.sort} onChange={set('sort')}>
            <option value="">هوشمند</option>
            <option value="due">موعد</option>
            <option value="priority">اولویت</option>
            <option value="created">جدیدترین</option>
            <option value="completed">آخرین انجام‌شده</option>
          </select>
        </label>
      </div>

      {loading ? <p className="empty">در حال بارگذاری…</p> : todos.length === 0 ? (
        <p className="empty">موردی پیدا نشد 🎉</p>
      ) : (
        <ul>
          {todos.map((t) =>
            edit?.id === t.id ? (
              <li key={t.id} className="editing">
                <form onSubmit={saveEdit}>
                  <div className="row"><input type="text" value={edit.title} onChange={setEd('title')} autoFocus /></div>
                  <div className="row">
                    <select value={edit.priority} onChange={setEd('priority')}>
                      {Object.entries(PRIO).map(([k, v]) => <option key={k} value={k}>اولویت {v}</option>)}
                    </select>
                    <input type="text" list="cats" placeholder="دسته‌بندی" value={edit.category} onChange={setEd('category')} />
                    <input type="date" value={edit.due_date} onChange={setEd('due_date')} />
                  </div>
                  <div className="row">
                    <button className="primary">ذخیره</button>
                    <button type="button" onClick={() => setEdit(null)}>انصراف</button>
                  </div>
                </form>
              </li>
            ) : (
              <li key={t.id} className={`p${t.priority} ${t.done ? 'done' : ''}`}>
                <input type="checkbox" checked={t.done} onChange={() => toggle(t)} />
                <div className="t">
                  {t.title}
                  <div className="meta">
                    {t.category && <span className="chip">🏷 {t.category}</span>}
                    {t.due_date && (
                      <span className={`chip ${!t.done && t.due_date < t0 ? 'overdue' : ''}`}>
                        ⏰ موعد: {fa(t.due_date)}{!t.done && t.due_date < t0 && ' (گذشته)'}
                      </span>
                    )}
                    <span className="chip">ثبت: {fa(t.created_at)}</span>
                    {t.completed_at && <span className="chip">✔ انجام: {fa(t.completed_at)}</span>}
                  </div>
                </div>
                <button className="act" title="ویرایش"
                  onClick={() => setEdit({ id: t.id, title: t.title, priority: String(t.priority), category: t.category || '', due_date: t.due_date || '' })}>✎</button>
                <button className="act" onClick={() => remove(t)} title="حذف">✕</button>
              </li>
            )
          )}
        </ul>
      )}
    </main>
  );
}
