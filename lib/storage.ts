// Storage implementation that supports S3-compatible storage (AWS S3, DigitalOcean Spaces)
// and local development storage
import { writeFile, unlink, mkdir } from 'fs/promises';
import path from 'path';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';

const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads');

// S3 Client configuration
let s3Client: S3Client | null = null;

function getS3Client(): S3Client {
  if (s3Client) return s3Client;

  const region = process.env.S3_REGION;
  const accessKeyId = process.env.S3_ACCESS_KEY_ID;
  const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY;
  const endpoint = process.env.S3_ENDPOINT;

  if (!accessKeyId || !secretAccessKey) {
    throw new Error('S3_ACCESS_KEY_ID and S3_SECRET_ACCESS_KEY environment variables are required');
  }

  const config: ConstructorParameters<typeof S3Client>[0] = {
    region,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  };

  // Set endpoint for S3-compatible services (DO Spaces, etc.)
  if (endpoint) {
    config.endpoint = endpoint;
  }

  s3Client = new S3Client(config);
  return s3Client;
}

/**
 * Generates S3 URL from bucket and key
 */
function getS3Url(key: string): string {
  const bucket = process.env.S3_BUCKET;
  const endpoint = process.env.S3_ENDPOINT;

  if (!bucket) {
    throw new Error('S3_BUCKET environment variable is required');
  }

  if (!endpoint) {
    throw new Error('S3_ENDPOINT environment variable is required');
  }

  return `${endpoint}/${bucket}/${key}`;
}

/**
 * Uploads a profile image to S3 or local storage based on environment
 */
export async function uploadProfileImage(file: File, userId: string): Promise<string> {
  try {
    const timestamp = Date.now();
    const filename = `profile-${userId}-${timestamp}${getExtension(file.name)}`;

    if (process.env.NODE_ENV === 'production' && process.env.S3_BUCKET) {
      // Use S3 for production
      const s3 = getS3Client();
      const buffer = Buffer.from(await file.arrayBuffer());

      const command = new PutObjectCommand({
        Bucket: process.env.S3_BUCKET,
        Key: filename,
        Body: buffer,
        ContentType: file.type,
        ACL: 'public-read',
      });

      await s3.send(command);
      return getS3Url(filename);
    } else {
      // Use local file system for development
      const filePath = path.join(UPLOAD_DIR, filename);

      await mkdir(UPLOAD_DIR, { recursive: true });

      const buffer = Buffer.from(await file.arrayBuffer());
      await writeFile(filePath, buffer);

      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      return `${baseUrl}/uploads/${filename}`;
    }
  } catch (error) {
    console.error('Error uploading profile image:', error);
    throw new Error('Failed to upload profile image');
  }
}

/**
 * Deletes a profile image from S3 or local storage
 */
export async function deleteProfileImage(imageUrl: string): Promise<void> {
  try {
    // Check if it's an S3 URL
    if (
      process.env.NODE_ENV === 'production' &&
      process.env.S3_BUCKET &&
      (imageUrl.includes(process.env.S3_ENDPOINT || '') ||
        imageUrl.includes('amazonaws.com') ||
        imageUrl.includes('digitaloceanspaces.com'))
    ) {
      // Delete from S3
      const s3 = getS3Client();

      // Extract key from URL
      const url = new URL(imageUrl);
      let key: string;

      if (process.env.S3_ENDPOINT) {
        // For S3-compatible services: endpoint/bucket/key
        key = url.pathname.substring(1); // Remove leading /
        const bucketPrefix = `${process.env.S3_BUCKET}/`;
        if (key.startsWith(bucketPrefix)) {
          key = key.substring(bucketPrefix.length);
        }
      } else {
        // For AWS S3: bucket.s3.region.amazonaws.com/key
        key = url.pathname.substring(1); // Remove leading /
      }

      const command = new DeleteObjectCommand({
        Bucket: process.env.S3_BUCKET,
        Key: key,
      });

      await s3.send(command);
    } else if (imageUrl.includes('/uploads/')) {
      // Delete from local file system
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
