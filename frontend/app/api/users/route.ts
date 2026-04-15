import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:5000';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const school_id = searchParams.get('school_id') || '';

  const url = `${BACKEND_URL}/api/users/?school_id=${encodeURIComponent(school_id)}`;

  try {
    const authHeader = request.headers.get('authorization') || '';
    const res = await fetch(url, {
      headers: authHeader ? { Authorization: authHeader } : {},
    });

    const text = await res.text();

    try {
      const data = JSON.parse(text);
      return NextResponse.json(data, { status: res.status });
    } catch {
      return new NextResponse(text, {
        status: res.status,
        headers: { 'Content-Type': res.headers.get('content-type') || 'text/plain' },
      });
    }
  } catch (e: any) {
    return NextResponse.json({ error: 'Backend unreachable', detail: e.message, url }, { status: 502 });
  }
}
