---
name: storage-uploads
description: File upload and storage reference - the S3-compatible storage helpers in lib/storage.ts, public profile images vs private documents with presigned URLs, key naming, the local-dev authenticated upload route, and the base64 workaround for uploading through tRPC. Load when handling file uploads, avatars, or document storage.
---

# File Upload & Storage

- **Configuration**: Use `./lib/storage.ts` utilities
- **Storage Options**:
  - **Production**: S3-compatible storage (AWS S3, DigitalOcean Spaces, MinIO, etc.)
  - **Development**: Local file system with authenticated API routes
- **Environment Variables**:
  - `S3_BUCKET`: Bucket name (required for production)
  - `S3_REGION`: AWS region (optional, for AWS S3)
  - `S3_ACCESS_KEY_ID`: Access key (required for production)
  - `S3_SECRET_ACCESS_KEY`: Secret key (required for production)
  - `S3_ENDPOINT`: Custom endpoint URL (required for non-AWS S3 services like DigitalOcean Spaces)
- **Upload Patterns**:
  - **Profile Images**: `uploadProfileImage(file, userId)` - Public access, stored in root
  - **Documents**: `uploadDocument(file, organizationId)` - Private access with presigned URLs
- **Security**:
  - Profile images: Public read access (ACL: public-read)
  - Documents: Private by default, access via `getPresignedDownloadUrl(key, expiresInSeconds)`
  - Development: Authenticated API route at `/api/uploads/[...path]`
- **File Organization**:
  - Profile images: `profile-{userId}-{timestamp}.{ext}`
  - Documents: `documents/{organizationId}/{timestamp}-{sanitizedFileName}`
- **Validation**: Implement proper file type and size validation before upload
- **Cleanup**: Use `deleteProfileImage(url)` and `deleteDocument(url)` when records are removed
- **URL Handling**: Helper functions `isS3Url(url)` and `getKeyFromPathname(pathname)` for cross-environment compatibility

## Uploading through tRPC

tRPC does not support multipart form data. For files up to ~5 MB, send base64 and convert
back to a buffer on the server. For anything larger, use a dedicated multipart route instead
of tRPC.

```typescript
const upload = trpc.user.uploadProfileImage.useMutation();
const deleteImage = trpc.user.deleteProfileImage.useMutation();

const handleUpload = async (file: File) => {
  const base64 = await fileToBase64(file); // helper from @/lib/utils
  await upload.mutateAsync({
    fileBase64: base64,
    fileName: file.name,
    mimeType: file.type as 'image/jpeg' | 'image/png' | 'image/webp',
  });
};
```

The 5 MB limit accounts for the ~33% base64 encoding overhead.

## Configuration

When you add or change a storage environment variable, record it in `kosuke.config.json`
under `environment` for both `preview` and `production`.
