import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:5000';

export async function GET(request: NextRequest) {
  const url = request.url;
  const { searchParams } = new URL(url);
  // Extract school_id from the path: /api/schools/[id]/teacher-courses
  const pathParts = new URL(request.url).pathname.split('/');
  // pathParts: ['', 'api', 'schools', '<id>', 'teacher-courses']
  const schoolId = pathParts[3] || '';

  const backendUrl = `${BACKEND_URL}/api/schools/${schoolId}/teacher-courses`;

  try {
    const authHeader = request.headers.get('authorization') || '';
    const res = await fetch(backendUrl, {
      headers: authHeader ? { Authorization: authHeader } : {},
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (e: any) {
    return NextResponse.json({ error: 'Backend unreachable', detail: e.message, url: backendUrl }, { status: 502 });
  }
}
