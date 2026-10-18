'use client';
import { useEffect, useState, useCallback, useRef } from 'react';

const PRIO = { 1: 'بالا', 2: 'متوسط', 3: 'پایین' };
const today = () => new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD به وقت محلی
const fa = (d) => new Date(d.length === 10 ? d + 'T12:00:00' : d).toLocaleDateString('fa-IR', { dateStyle: 'medium' });
const faTime = (d) => new Date(d).toLocaleString('fa-IR', { dateStyle: 'medium', timeStyle: 'short' });
const emptyNew = { title: '', description: '', priority: '2', category: '', due_date: '' };

async function api(url, method, body) {
  return fetch(url, { method, body: body && JSON.stringify(body) });
}


// انتخاب از دسته‌های قبلی یا تایپ دسته‌ی جدید
function CategoryPicker({ value, onChange, cats }) {
  const [custom, setCustom] = useState(false);
  const ref = useRef(null);

  // بعد از ذخیره، وقتی دسته‌ی جدید وارد لیست شد دوباره به حالت انتخاب برگرد
  useEffect(() => {
    if (custom && value && cats.includes(value) && document.activeElement !== ref.current) setCustom(false);
  }, [cats, custom, value]);

  if (custom) {
    return (
      <div className="catnew">
        <input ref={ref} type="text" autoFocus placeholder="نام دسته‌بندی جدید…" value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={() => { if (!value.trim() || cats.includes(value)) setCustom(false); }} />
        <button type="button" title="انتخاب از دسته‌های قبلی" onClick={() => { setCustom(false); onChange(''); }}>↩</button>
      </div>
    );
  }
  const opts = value && !cats.includes(value) ? [...cats, value] : cats;
  return (
    <select value={value} title="دسته‌بندی"
      onChange={(e) => {
        if (e.target.value === '__new') { setCustom(true); onChange(''); }
        else onChange(e.target.value);
      }}>
      <option value="">بدون دسته‌بندی</option>
      {opts.map((c) => <option key={c} value={c}>{c}</option>)}
      <option value="__new">➕ دسته‌بندی جدید…</option>
    </select>
  );
}

function Modal({ t, cats, startEdit, onClose, onToggle, onSave, onDelete }) {
  const [editing, setEditing] = useState(startEdit);
  const [d, setD] = useState({
    title: t.title, description: t.description || '', priority: String(t.priority),
    category: t.category || '', due_date: t.due_date || '',
  });
  const ed = (k) => (e) => setD({ ...d, [k]: e.target.value });
  const overdue = !t.done && t.due_date && t.due_date < today();

  useEffect(() => {
    const h = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  async function submit(e) {
    e.preventDefault();
    if (!d.title.trim()) return;
    await onSave(d);
    setEditing(false);
  }

  return (
    <div className="backdrop" onClick={onClose}>
      <div className="modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        {editing ? (
          <form onSubmit={submit}>
            <div className="modal-head"><h2>ویرایش کار</h2><button type="button" className="x" onClick={onClose}>✕</button></div>
            <input type="text" value={d.title} onChange={ed('title')} placeholder="عنوان" autoFocus />
            <textarea rows={5} value={d.description} onChange={ed('description')} placeholder="توضیحات (مثلاً شماره نامه، اطلاعات تماس، …)" />
            <div className="row">
              <select value={d.priority} onChange={ed('priority')}>
                {Object.entries(PRIO).map(([k, v]) => <option key={k} value={k}>اولویت {v}</option>)}
              </select>
              <CategoryPicker cats={cats} value={d.category} onChange={(v) => setD({ ...d, category: v })} />
              <input type="date" value={d.due_date} onChange={ed('due_date')} />
            </div>
            <div className="modal-actions">
              <button className="primary">ذخیره</button>
              <button type="button" onClick={() => setEditing(false)}>انصراف</button>
            </div>
          </form>
        ) : (
          <>
            <div className="modal-head"><h2>{t.title}</h2><button className="x" onClick={onClose} title="بستن">✕</button></div>
            <span className={`status ${t.done ? 'ok' : overdue ? 'bad' : ''}`}>
              {t.done ? '✔ انجام‌شده' : overdue ? '⚠ انجام‌نشده — موعد گذشته' : '⏳ انجام‌نشده'}
            </span>
            <div className={`desc ${t.description ? '' : 'none'}`}>{t.description || 'توضیحاتی ثبت نشده است.'}</div>
            <dl className="info">
              <dt>اولویت</dt><dd>{PRIO[t.priority]}</dd>
              <dt>دسته‌بندی</dt><dd>{t.category || '—'}</dd>
              <dt>موعد انجام</dt><dd>{t.due_date ? fa(t.due_date) : '—'}</dd>
              <dt>تاریخ ثبت</dt><dd>{faTime(t.created_at)}</dd>
              <dt>تاریخ انجام</dt><dd>{t.completed_at ? faTime(t.completed_at) : '—'}</dd>
            </dl>
            <div className="modal-actions">
              <button className="primary" onClick={onToggle}>{t.done ? 'بازگردانی به انجام‌نشده' : 'انجام شد ✔'}</button>
              <button onClick={() => setEditing(true)}>ویرایش</button>
              <button className="danger" onClick={onDelete}>حذف</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function Home() {
  const [todos, setTodos] = useState([]);
  const [cats, setCats] = useState([]);
  const [n, setN] = useState(emptyNew);
  const [f, setF] = useState({ status: 'active', q: '', category: '', priority: '', dateField: 'created', from: '', to: '', sort: '' });
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null); // { t: todo, edit: boolean }

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
  async function patch(id, body) {
    const r = await api(`/api/todos/${id}`, 'PATCH', body);
    if (!r.ok) return null;
    const row = await r.json();
    load();
    return row;
  }
  async function toggle(t) {
    const row = await patch(t.id, { done: !t.done });
    if (row && modal?.t.id === t.id) setModal({ ...modal, t: row });
  }
  async function saveModal(body) {
    const row = await patch(modal.t.id, body);
    if (row) setModal({ t: row, edit: false });
  }
  async function remove(t) {
    if (!confirm('این کار برای همیشه حذف شود؟')) return;
    await api(`/api/todos/${t.id}`, 'DELETE');
    if (modal?.t.id === t.id) setModal(null);
    load();
  }
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const setNew = (k) => (e) => setN({ ...n, [k]: e.target.value });
  const t0 = today();

  return (
    <main>
      <h1>📝 کارهای من</h1>

      <form className="add-form" onSubmit={add}>
        <div className="row">
          <input type="text" placeholder="کار جدید…" value={n.title} onChange={setNew('title')} />
          {/* <button className="primary">افزودن</button> */}
        </div>
        <textarea rows={2} placeholder="توضیحات (اختیاری)" value={n.description} onChange={setNew('description')} />
        <div className="row" style={{ marginTop: 8 }}>
          <select value={n.priority} onChange={setNew('priority')} title="اولویت">
            {Object.entries(PRIO).map(([k, v]) => <option key={k} value={k}>اولویت {v}</option>)}
          </select>
          <CategoryPicker cats={cats} value={n.category} onChange={(v) => setN({ ...n, category: v })} />
          <input type="date" value={n.due_date} onChange={setNew('due_date')} title="موعد انجام" />
        </div>
        <button className="primary" style={{ width: '100%' }}>افزودن</button>
      </form>

      <div className="filters">
        <label>نمایش
          <select value={f.status} onChange={set('status')}>
            <option value="active">انجام‌نشده‌ها</option>
            <option value="done">انجام‌شده‌ها</option>
            <option value="all">همه</option>
          </select>
        </label>
        <label className="grow">جستجو در عنوان و توضیحات
          <input type="search" value={f.q} onChange={set('q')} placeholder="بخشی از عنوان یا توضیحات…" />
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
          {todos.map((t) => (
            <li key={t.id} className={`p${t.priority} ${t.done ? 'done' : ''}`}>
              <input type="checkbox" checked={t.done} onChange={() => toggle(t)} />
              <div className="t" onClick={() => setModal({ t, edit: false })}>
                {t.title}
                {t.description && <div className="preview">📄 {t.description}</div>}
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
              <button className="act" title="ویرایش" onClick={() => setModal({ t, edit: true })}>✎</button>
              <button className="act" onClick={() => remove(t)} title="حذف">✕</button>
            </li>
          ))}
        </ul>
      )}

      {modal && (
        <Modal
          key={modal.t.id}
          t={modal.t}
          cats={cats}
          startEdit={modal.edit}
          onClose={() => setModal(null)}
          onToggle={() => toggle(modal.t)}
          onSave={saveModal}
          onDelete={() => remove(modal.t)}
        />
      )}
    </main>
  );
}
