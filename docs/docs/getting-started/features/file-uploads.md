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

Automatically configured by Vercel when you enable Blob storage. The required token is added to your environment variables.

## Profile Images

Users can upload profile images:

### Upload Flow

Users select a file, which is converted to base64 and sent to the API. The server uploads it to Vercel Blob storage, saves the URL to the database, and returns the CDN URL for immediate display.

### File Validation

Supported formats:

- JPEG/JPG
- PNG
- WebP

Size limit: 5 MB

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

The system validates that uploaded files are in allowed formats (JPEG, PNG, WebP) to ensure compatibility and security.

### 2. Validate File Size

Files are checked against a maximum size limit (5 MB) to prevent abuse and manage storage costs.

### 3. Sanitize File Names

File names are sanitized to remove special characters and ensure safe storage and retrieval.

### 4. Handle Upload Errors

Upload errors are caught and handled gracefully, providing clear error messages to users while logging issues for debugging.

## Deleting Files

### Delete Workflow

When a file is deleted, it's removed from both Blob storage and the database. The UI updates to reflect the deletion immediately.

## Image Optimization

### Automatic Optimization

Vercel Blob automatically optimizes images by converting to efficient formats (WebP), generating responsive sizes, enabling CDN caching, and applying compression. This ensures fast loading times worldwide.

### Display Optimized Images

Images are displayed using Next.js Image component which provides automatic lazy loading, responsive sizing, and format optimization.

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

Custom upload components can be created using React with built-in loading states, progress indicators, and error handling for a seamless user experience.

### Direct Uploads

For larger files, the system supports direct uploads where the client uploads directly to Blob storage using a pre-signed URL, reducing server load and improving upload speed.

## Next Steps

Learn about error monitoring:

👉 **[Error Monitoring](./error-monitoring)**
