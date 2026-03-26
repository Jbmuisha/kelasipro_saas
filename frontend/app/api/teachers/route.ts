import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:5000';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const school_id = searchParams.get('school_id') || '';

  const url = `${BACKEND_URL}/api/teachers?school_id=${school_id}`;

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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const authHeader = request.headers.get('authorization') || '';
    const res = await fetch(`${BACKEND_URL}/api/teachers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(authHeader ? { Authorization: authHeader } : {}),
      },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (e: any) {
    return NextResponse.json({ error: 'Backend unreachable', detail: e.message }, { status: 502 });
  }
}
