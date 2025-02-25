import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir, unlink } from 'fs/promises';
import { join } from 'path';
import { v4 as uuidv4 } from 'uuid';

// Directory to store uploaded files
const UPLOAD_DIR = join(process.cwd(), 'public', 'uploads');

export async function POST(request: NextRequest) {
  let filepath = '';
  
  try {
    // Ensure upload directory exists
    await mkdir(UPLOAD_DIR, { recursive: true });

    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'File must be an image' }, { status: 400 });
    }

    // Generate unique filename
    const ext = file.name.split('.').pop();
    const filename = `${uuidv4()}.${ext}`;
    filepath = join(UPLOAD_DIR, filename);

    // Convert File to Buffer and save
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filepath, buffer);

    // Get the host from the request
    const host = request.headers.get('host');
    if (!host) {
      throw new Error('Host header is missing');
    }
    const protocol = process.env.NODE_ENV === 'development' ? 'http' : 'https';

    // Return the full URL
    const url = `${protocol}://${host}/uploads/${filename}`;
    
    // Schedule file deletion after response
    setTimeout(async () => {
      try {
        await unlink(filepath);
        console.log(`Deleted temporary file: ${filepath}`);
      } catch (error) {
        console.error(`Error deleting temporary file: ${filepath}`, error);
      }
    }, 1000);

    return NextResponse.json({ url });

  } catch (error) {
    // Clean up file if it was created
    if (filepath) {
      try {
        await unlink(filepath);
      } catch (cleanupError) {
        console.error('Error cleaning up file:', cleanupError);
      }
    }

    console.error('Error uploading file:', error);
    return NextResponse.json(
      { error: 'Error uploading file' },
      { status: 500 }
    );
  }
}