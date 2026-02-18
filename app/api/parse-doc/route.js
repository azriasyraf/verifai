// PDF parsing is handled client-side via pdfjs-dist in GenerationForm.jsx.
// This route is kept as a stub in case server-side parsing is needed in future.
import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json({ success: false, error: 'PDF parsing is handled client-side.' }, { status: 410 });
}
