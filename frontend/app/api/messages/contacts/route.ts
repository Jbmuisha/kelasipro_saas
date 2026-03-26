import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:5000';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization') || '';
    const res = await fetch(`${BACKEND_URL}/api/messages/contacts`, {
      headers: authHeader ? { Authorization: authHeader } : {},
      cache: 'no-store',
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (e: any) {
    return NextResponse.json({ error: 'Backend unreachable', detail: e.message }, { status: 502 });
  }
}
