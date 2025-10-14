---
sidebar_position: 5
---

# File Uploads

File upload functionality using Vercel Blob storage.

## Overview

Kosuke Template includes file upload support for:

- Profile images
- Organization logos
- Document attachments
- Asset storage

## Vercel Blob Storage

### Features

- **CDN delivery**: Fast global access
- **Automatic optimization**: Image processing
- **Simple API**: Easy to use
- **Secure**: Access control built-in

### Configuration

Automatically configured by Vercel:

```bash
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_...
```

## Profile Images

Users can upload profile images:

### Upload Flow

```
1. User selects file → 2. Convert to base64 → 3. Send to API
→ 4. Upload to Blob → 5. Update database → 6. Display image
```

### File Validation

Supported formats:

- JPEG/JPG
- PNG
- WebP

Size limit: 5 MB

### Implementation

```typescript
import { put } from '@vercel/blob';

// Upload file
const blob = await put(fileName, file, {
  access: 'public',
  token: process.env.BLOB_READ_WRITE_TOKEN,
});

// blob.url: CDN URL for the uploaded file
```

## Organization Logos

Organizations can upload custom logos:

### Upload Process

Same as profile images:

- Admin uploads logo
- Stores in Vercel Blob
- URL saved to database
- Displayed in organization UI

### Access Control

Only organization admins can:

- Upload logo
- Update logo
- Delete logo

## File Upload Best Practices

### 1. Validate File Type

```typescript
const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];

if (!allowedTypes.includes(file.type)) {
  throw new Error('Invalid file type');
}
```

### 2. Validate File Size

```typescript
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

if (file.size > MAX_SIZE) {
  throw new Error('File too large');
}
```

### 3. Sanitize File Names

```typescript
const sanitizedName = fileName.toLowerCase().replace(/[^a-z0-9.-]/g, '-');
```

### 4. Handle Upload Errors

```typescript
try {
  const blob = await put(fileName, file);
  return blob.url;
} catch (error) {
  console.error('Upload failed:', error);
  throw new Error('Failed to upload file');
}
```

## Deleting Files

### Delete from Blob

```typescript
import { del } from '@vercel/blob';

await del(fileUrl);
```

### Delete Workflow

1. Delete from Blob storage
2. Update database (remove URL)
3. Update UI

## Image Optimization

### Automatic Optimization

Vercel Blob includes:

- Format conversion (WebP)
- Responsive sizes
- CDN caching
- Compression

### Display Optimized Images

```typescript
import Image from 'next/image';

<Image
  src={blob.url}
  alt="Profile"
  width={200}
  height={200}
  className="rounded-full"
/>
```

## Storage Management

### Monitor Usage

View in Vercel dashboard:

- **Storage** tab
- Total storage used
- File count
- Traffic

### Clean Up

Periodically delete unused files:

- Old profile images
- Deleted organization logos
- Temporary uploads

## Security

### Access Control

File URLs are public but:

- Unpredictable URLs
- No directory listing
- Access logs available

### Content Security

Validate uploads:

- Check file type
- Scan for malware (optional)
- Limit file size
- Sanitize metadata

## Limits & Pricing

### Hobby (Free)

- 1 GB storage
- 100 GB bandwidth

### Pro ($20/month)

- 100 GB storage
- 1 TB bandwidth
- No read limits

## Advanced Features

### Custom Upload UI

Create custom upload components:

```typescript
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';

export function FileUploader() {
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const { url } = await response.json();
      // Handle success
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <input type="file" onChange={handleUpload} />
      {uploading && <p>Uploading...</p>}
    </div>
  );
}
```

### Direct Uploads

For large files, use direct uploads:

1. Request upload URL from API
2. Upload directly to Blob from client
3. Notify backend when complete

## Resources

- [Vercel Blob Documentation](https://vercel.com/docs/storage/vercel-blob)
- [Next.js Image Optimization](https://nextjs.org/docs/app/api-reference/components/image)
