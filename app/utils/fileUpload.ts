import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Base directory for storing uploaded files
 */
export const UPLOADS_DIR = path.join(__dirname, '../../public/uploads');
export const PHOTOS_DIR = path.join(UPLOADS_DIR, 'photos');
export const DOCUMENTS_DIR = path.join(UPLOADS_DIR, 'documents');

/**
 * Ensure upload directories exist
 */
export function ensureUploadDirs() {
  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  }
  if (!fs.existsSync(PHOTOS_DIR)) {
    fs.mkdirSync(PHOTOS_DIR, { recursive: true });
  }
  if (!fs.existsSync(DOCUMENTS_DIR)) {
    fs.mkdirSync(DOCUMENTS_DIR, { recursive: true });
  }
}

/**
 * Save uploaded file and return the relative path
 */
export async function saveUploadedFile(
  file: File,
  subdirectory: 'photos' | 'documents',
  employeeId: number
): Promise<string> {
  ensureUploadDirs();

  // Generate unique filename
  const timestamp = Date.now();
  const originalName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
  const ext = path.extname(originalName);
  const baseName = path.basename(originalName, ext);
  const uniqueName = `${employeeId}_${timestamp}_${baseName}${ext}`;

  const targetDir = subdirectory === 'photos' ? PHOTOS_DIR : DOCUMENTS_DIR;
  const filePath = path.join(targetDir, uniqueName);

  // Convert File to Buffer and save
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  fs.writeFileSync(filePath, buffer);

  // Return relative path from public directory
  return `/uploads/${subdirectory}/${uniqueName}`;
}

/**
 * Delete a file from the file system
 */
export function deleteFile(filePath: string): void {
  try {
    // Remove leading slash and convert to absolute path
    const relativePath = filePath.startsWith('/') ? filePath.slice(1) : filePath;
    const absolutePath = path.join(__dirname, '../../public', relativePath);
    
    if (fs.existsSync(absolutePath)) {
      fs.unlinkSync(absolutePath);
    }
  } catch (error) {
    console.error('Error deleting file:', error);
  }
}

