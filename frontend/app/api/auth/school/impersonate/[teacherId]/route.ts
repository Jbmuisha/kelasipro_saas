import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:5000';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ teacherId: string }> }
) {
  try {
    const { teacherId } = await params;
    const authHeader = request.headers.get('authorization') || '';

    console.log('[SCHOOL IMPERSONATE API] Teacher ID:', teacherId);
    console.log('[SCHOOL IMPERSONATE API] Auth header exists:', !!authHeader);

    const res = await fetch(`${BACKEND_URL}/api/auth/school/impersonate/${teacherId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(authHeader ? { Authorization: authHeader } : {}),
      },
    });

    const text = await res.text();
    console.log('[SCHOOL IMPERSONATE API] Backend response status:', res.status);
    console.log('[SCHOOL IMPERSONATE API] Backend response:', text.substring(0, 200));

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
    console.error('[SCHOOL IMPERSONATE API ERROR]', e);
    return NextResponse.json(
      { error: 'Backend unreachable', detail: e.message },
      { status: 502 }
    );
  }
}

