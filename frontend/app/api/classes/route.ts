import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:5000';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const school_id = searchParams.get('school_id') || '';
  const level = searchParams.get('level') || '';

  let url = `${BACKEND_URL}/api/classes?school_id=${school_id}`;
  if (level) url += `&level=${encodeURIComponent(level)}`;

  try {
    const authHeader = request.headers.get('authorization') || '';
    const res = await fetch(url, {
      headers: authHeader ? { Authorization: authHeader } : {},
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (e: any) {
    return NextResponse.json({ error: 'Backend unreachable', detail: e.message, url }, { status: 502 });
  }
}
