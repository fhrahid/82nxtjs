import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import { ROSTER_TEMPLATES_DIR } from '@/lib/constants';

export async function GET() {
  try {
    // Ensure roster_templates directory exists
    try {
      await fs.mkdir(ROSTER_TEMPLATES_DIR, { recursive: true });
    } catch (e) {
      // Directory might already exist
    }

    // Read all CSV files from the templates directory
    const files = await fs.readdir(ROSTER_TEMPLATES_DIR);
    const csvFiles = files.filter(f => f.endsWith('.csv'));

    // Get file stats for each template
    const templates = await Promise.all(
      csvFiles.map(async (fileName) => {
        const filePath = `${ROSTER_TEMPLATES_DIR}/${fileName}`;
        const stats = await fs.stat(filePath);
        
        // Remove .csv extension for display
        const monthYear = fileName.replace('.csv', '');
        
        return {
          fileName,
          monthYear,
          createdAt: stats.birthtime,
          modifiedAt: stats.mtime,
          size: stats.size
        };
      })
    );

    // Sort by month/year (most recent first)
    templates.sort((a, b) => b.modifiedAt.getTime() - a.modifiedAt.getTime());

    return NextResponse.json({ success: true, templates });
  } catch (e: any) {
    console.error('Error listing roster templates:', e);
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
