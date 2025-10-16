import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { ROSTER_TEMPLATES_DIR } from '@/lib/constants';

export async function POST(req: Request) {
  try {
    const { fileName } = await req.json();

    if (!fileName) {
      return NextResponse.json({ success: false, error: 'Missing fileName' }, { status: 400 });
    }

    // Security: prevent directory traversal
    if (fileName.includes('..') || fileName.includes('/') || fileName.includes('\\')) {
      return NextResponse.json({ success: false, error: 'Invalid fileName' }, { status: 400 });
    }

    const filePath = path.join(ROSTER_TEMPLATES_DIR, fileName);
    
    // Check if file exists
    try {
      await fs.access(filePath);
    } catch (e) {
      return NextResponse.json({ success: false, error: 'Template not found' }, { status: 404 });
    }

    // Delete the file
    await fs.unlink(filePath);

    return NextResponse.json({ 
      success: true, 
      message: `Template ${fileName} deleted successfully`
    });
  } catch (e: any) {
    console.error('Error deleting roster template:', e);
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
