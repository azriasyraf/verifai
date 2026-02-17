import { NextResponse } from 'next/server';
import pdfParse from 'pdf-parse';

export const maxDuration = 30;

export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');

    if (!file) {
      return NextResponse.json({ success: false, error: 'No file provided' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const result = await pdfParse(buffer);
    const text = result.text?.trim() || '';

    if (!text) {
      return NextResponse.json({ success: false, error: 'Could not extract text from PDF. The file may be scanned or image-based.' }, { status: 422 });
    }

    return NextResponse.json({ success: true, text });
  } catch (error) {
    console.error('PDF parse error:', error);
    return NextResponse.json({ success: false, error: 'Failed to parse PDF. Check the file is not password-protected.' }, { status: 500 });
  }
}
