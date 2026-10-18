import { NextResponse } from 'next/server';

// قفل ساده با رمز عبور (Basic Auth). نام کاربری هر چیزی می‌تواند باشد.
export function middleware(req) {
  const pass = process.env.APP_PASSWORD;
  if (!pass) return NextResponse.next();
  const h = req.headers.get('authorization') || '';
  if (h.startsWith('Basic ')) {
    const decoded = atob(h.slice(6));
    if (decoded.slice(decoded.indexOf(':') + 1) === pass) return NextResponse.next();
  }
  return new NextResponse('Auth required', {
    status: 401,
    headers: { 'WWW-Authenticate': 'Basic realm="todo"' },
  });
}
