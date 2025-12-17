// Storage implementation that supports S3-compatible storage (AWS S3, DigitalOcean Spaces)
// and local development storage
import { mkdir, unlink, writeFile } from 'fs/promises';
import path from 'path';

import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

// Store uploads outside public directory to prevent direct access
const UPLOAD_DIR = path.join(process.cwd(), 'uploads');
const EXPIRATION_TIME = 60 * 5;

/**
 * Extract S3 key from URL pathname
 * Handles both AWS S3 and S3-compatible services (DigitalOcean Spaces, MinIO, etc.)
 * @param pathname - The pathname from a URL (e.g., /documents/file.pdf or /bucket/documents/file.pdf)
 * @returns The S3 key without leading slash and bucket prefix (e.g., documents/file.pdf)
 */
export function getKeyFromPathname(pathname: string): string {
  let key = pathname.substring(1); // Remove leading /

  // For S3-compatible services with custom endpoints, the pathname may include the bucket name
  // Example: /my-bucket/documents/file.pdf -> documents/file.pdf
  if (process.env.S3_ENDPOINT && process.env.S3_BUCKET) {
    const bucketPrefix = `${process.env.S3_BUCKET}/`;
    if (key.startsWith(bucketPrefix)) {
      key = key.substring(bucketPrefix.length);
    }
  }

  return key;
}

/**
 * Check if a URL is an S3 URL (AWS S3 or S3-compatible service)
 * @param url - The URL to check
 * @returns True if the URL is an S3 URL, false otherwise
 */
export function isS3Url(url: string): boolean {
  return (
    process.env.NODE_ENV === 'production' &&
    !!process.env.S3_BUCKET &&
    (url.includes(process.env.S3_ENDPOINT || '') ||
      url.includes('amazonaws.com') ||
      url.includes('digitaloceanspaces.com'))
  );
}

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
 * Generates a presigned URL for a file in S3 or local storage based on environment
 * @param storageKey - The key of the file in S3 or local storage
 * @param expiresInSeconds - The expiration time in seconds (default: 300 seconds)
 * @returns The presigned URL
 */
export async function getPresignedDownloadUrl(
  storageKey: string,
  expiresInSeconds = EXPIRATION_TIME
) {
  if (process.env.NODE_ENV === 'production' && process.env.S3_BUCKET) {
    const s3 = getS3Client();
    const command = new GetObjectCommand({
      Bucket: process.env.S3_BUCKET,
      Key: storageKey,
    });

    const url = await getSignedUrl(s3, command, {
      expiresIn: expiresInSeconds,
    });

    return url;
  } else {
    // Development: Return authenticated API route
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    return `${baseUrl}/api/uploads/${storageKey}`;
  }
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
    const filename = `profile-${userId}-${timestamp}${path.extname(file.name)}`;

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
    if (isS3Url(imageUrl)) {
      // Delete from S3
      const s3 = getS3Client();

      // Extract key from URL
      const url = new URL(imageUrl);
      const key = getKeyFromPathname(url.pathname);

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
 * Uploads a document to S3 or local storage based on environment
 * @param file - The file to upload
 * @param organizationId - The ID of the organization
 * @returns The key of the uploaded file
 */
export async function uploadDocument(file: File, organizationId: string): Promise<string> {
  try {
    const timestamp = Date.now();
    const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const key = `documents/${organizationId}/${timestamp}-${sanitizedFileName}`;

    if (process.env.NODE_ENV === 'production' && process.env.S3_BUCKET) {
      const s3 = getS3Client();
      const buffer = Buffer.from(await file.arrayBuffer());

      const command = new PutObjectCommand({
        Bucket: process.env.S3_BUCKET,
        Key: key,
        Body: buffer,
        ContentType: file.type,
      });

      await s3.send(command);

      return key;
    } else {
      // Use local file system for development
      const filePath = path.join(UPLOAD_DIR, key);

      await mkdir(path.dirname(filePath), { recursive: true });

      const buffer = Buffer.from(await file.arrayBuffer());
      await writeFile(filePath, buffer);

      return key;
    }
  } catch (error) {
    console.error('Error uploading document:', error);
    throw new Error('Failed to upload document');
  }
}

/**
 * Deletes a document from S3 or local storage
 */
export async function deleteDocument(documentUrl: string): Promise<void> {
  try {
    if (isS3Url(documentUrl)) {
      // Delete from S3
      const s3 = getS3Client();

      const url = new URL(documentUrl);
      const key = getKeyFromPathname(url.pathname);

      const command = new DeleteObjectCommand({
        Bucket: process.env.S3_BUCKET,
        Key: key,
      });

      await s3.send(command);
    } else if (documentUrl.includes('/uploads/')) {
      const parts = documentUrl.split('/uploads/');
      if (parts.length < 2) {
        console.error('Invalid upload URL format');
        return;
      }

      // Delete from local file system
      const relativePath = parts[1];
      const filePath = path.join(UPLOAD_DIR, relativePath);
      await unlink(filePath);
    }
  } catch (error) {
    console.error('Error deleting document:', error);
    // Don't throw, as this should not block the delete process
  }
}
