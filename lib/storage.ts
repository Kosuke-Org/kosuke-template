// Simple in-memory file storage implementation
// In production, this would use a real storage service like AWS S3

import { writeFile, unlink } from 'fs/promises';
import path from 'path';

const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads');

/**
 * Uploads a profile image to the server's file system
 */
export async function uploadProfileImage(file: File, userId: number): Promise<string> {
  try {
    // Create a unique filename
    const timestamp = Date.now();
    const filename = `profile-${userId}-${timestamp}${getExtension(file.name)}`;
    const filePath = path.join(UPLOAD_DIR, filename);

    // Convert file to buffer
    const buffer = Buffer.from(await file.arrayBuffer());

    // Write file to disk
    await writeFile(filePath, buffer);

    // Return the relative URL path
    return `/uploads/${filename}`;
  } catch (error) {
    console.error('Error uploading profile image:', error);
    throw new Error('Failed to upload profile image');
  }
}

/**
 * Deletes a profile image from the server's file system
 */
export async function deleteProfileImage(imageUrl: string): Promise<void> {
  try {
    // Get the filename from the URL
    const filename = path.basename(imageUrl);
    const filePath = path.join(UPLOAD_DIR, filename);

    // Delete the file
    await unlink(filePath);
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
