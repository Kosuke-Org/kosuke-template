// Storage implementation that supports both local development and production
import { writeFile, unlink, mkdir } from 'fs/promises';
import path from 'path';
import { put, del } from '@vercel/blob';

const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads');

/**
 * Uploads a profile image to either local storage or Vercel Blob based on environment
 */
export async function uploadProfileImage(file: File, userId: string): Promise<string> {
  try {
    // Create a unique filename
    const timestamp = Date.now();
    const filename = `profile-${userId}-${timestamp}${getExtension(file.name)}`;

    if (process.env.NODE_ENV === 'production') {
      // Use Vercel Blob for production
      const blob = await put(filename, file, {
        access: 'public',
        contentType: file.type,
      });
      return blob.url;
    } else {
      // Use local file system for development
      const filePath = path.join(UPLOAD_DIR, filename);

      // Ensure uploads directory exists
      await mkdir(UPLOAD_DIR, { recursive: true });

      // Convert file to buffer
      const buffer = Buffer.from(await file.arrayBuffer());

      // Write file to disk
      await writeFile(filePath, buffer);

      // Return the full URL for local development
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      return `${baseUrl}/uploads/${filename}`;
    }
  } catch (error) {
    console.error('Error uploading profile image:', error);
    throw new Error('Failed to upload profile image');
  }
}

/**
 * Deletes a profile image from either local storage or Vercel Blob
 */
export async function deleteProfileImage(imageUrl: string): Promise<void> {
  try {
    if (process.env.NODE_ENV === 'production' && imageUrl.includes('vercel-storage.com')) {
      // Delete from Vercel Blob
      await del(imageUrl);
    } else if (imageUrl.includes('/uploads/')) {
      // Delete from local file system (handle both relative and full URLs)
      const filename = path.basename(imageUrl);
      const filePath = path.join(UPLOAD_DIR, filename);
      await unlink(filePath);
    }
  } catch (error) {
    console.error('Error deleting profile image:', error);
    // Don't throw, as this should not block the update process
  }
}

/**
 * Gets the file extension from a filename
 */
function getExtension(filename: string): string {
  const ext = path.extname(filename);
  return ext || '.jpg'; // Default to .jpg if no extension
}
