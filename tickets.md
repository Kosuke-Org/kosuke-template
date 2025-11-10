# tRPC Migration Tickets - User Router & Profile Upload

## Overview

Migrate user-facing REST API endpoints (non-billing) to tRPC for end-to-end type safety, better DX, and consistent patterns across the application.

### Endpoints to Migrate

- ✅ User notification settings (2 endpoints)
- ✅ File upload operations (1 endpoint)

### Deleted as Unused

- ❌ User sync endpoint - Not called from anywhere, syncing happens automatically via webhooks and `ensureUserSynced()` in API routes

---

## Migration Tickets

### Phase 1: User Router Setup

#### Ticket 1: Create User Router

**Priority:** High  
**Estimated Time:** 1.5 hours

**Tasks:**

1. Create `lib/trpc/routers/user.ts`
2. Set up base router structure
3. Add user router to main router
4. Migrate notification settings endpoints

**Files to Create:**

- `lib/trpc/routers/user.ts`

**Files to Modify:**

- `lib/trpc/router.ts` (add user router)

**Implementation:**

```typescript
// lib/trpc/routers/user.ts
import { router, protectedProcedure } from '../init';
import { z } from 'zod';
import { db } from '@/lib/db/drizzle';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

const notificationSettingsSchema = z.object({
  emailNotifications: z.boolean(),
  marketingEmails: z.boolean(),
  securityAlerts: z.boolean(),
});

export const userRouter = router({
  getNotificationSettings: protectedProcedure.query(async ({ ctx }) => {
    const user = await db
      .select({ notificationSettings: users.notificationSettings })
      .from(users)
      .where(eq(users.clerkUserId, ctx.userId))
      .limit(1);

    if (!user.length) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'User not found' });
    }

    const defaultSettings = {
      emailNotifications: true,
      marketingEmails: false,
      securityAlerts: true,
    };

    if (!user[0].notificationSettings) {
      return defaultSettings;
    }

    try {
      return JSON.parse(user[0].notificationSettings);
    } catch {
      return defaultSettings;
    }
  }),

  updateNotificationSettings: protectedProcedure
    .input(notificationSettingsSchema)
    .mutation(async ({ input, ctx }) => {
      await db
        .update(users)
        .set({
          notificationSettings: JSON.stringify(input),
          updatedAt: new Date(),
        })
        .where(eq(users.clerkUserId, ctx.userId));

      return input;
    }),
});
```

**Files to Delete:**

- `app/api/user/notification-settings/route.ts`
- ~~`app/api/user/sync/route.ts`~~ (already deleted - unused endpoint)

---

#### Ticket 2: Migrate Profile Image Upload

**Priority:** High  
**Estimated Time:** 2 hours  
**Depends On:** Ticket 1

**Current Endpoint:**

- `POST /api/upload/profile-image`
- `DELETE /api/upload/profile-image`

**Tasks:**

1. Create helper function to convert File to base64
2. Create `uploadProfileImage` mutation with base64 input
3. Create `deleteProfileImage` mutation
4. Update `use-profile-upload.ts` hook to use tRPC
5. Test upload/delete flows

**Implementation:**

```typescript
// lib/trpc/routers/user.ts (add to existing router)

uploadProfileImage: protectedProcedure
  .input(z.object({
    fileBase64: z.string(),
    fileName: z.string(),
    mimeType: z.enum(['image/jpeg', 'image/png', 'image/webp']),
  }))
  .mutation(async ({ input, ctx }) => {
    // Validate file size (base64 is ~33% larger)
    const estimatedSize = (input.fileBase64.length * 3) / 4;
    const maxSize = 5 * 1024 * 1024; // 5MB

    if (estimatedSize > maxSize) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'File too large. Please upload an image smaller than 5MB.',
      });
    }

    // Convert base64 to buffer
    const buffer = Buffer.from(input.fileBase64.split(',')[1], 'base64');
    const file = new File([buffer], input.fileName, { type: input.mimeType });

    // Delete old image if exists
    if (ctx.user.imageUrl) {
      await deleteProfileImage(ctx.user.imageUrl);
    }

    // Upload new image
    const imageUrl = await uploadProfileImage(file, ctx.userId);

    // Update Clerk user metadata
    const clerk = await clerkClient();
    await clerk.users.updateUser(ctx.userId, {
      publicMetadata: {
        ...ctx.user.publicMetadata,
        customProfileImageUrl: imageUrl,
      },
    });

    // Sync to local DB
    const updatedUser = await clerk.users.getUser(ctx.userId);
    await syncUserFromClerk(updatedUser);

    return {
      success: true,
      imageUrl,
      message: 'Profile image updated successfully',
    };
  }),

deleteProfileImage: protectedProcedure
  .mutation(async ({ ctx }) => {
    if (!ctx.user.imageUrl) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'No profile image to delete',
      });
    }

    await deleteProfileImage(ctx.user.imageUrl);

    const clerk = await clerkClient();
    await clerk.users.updateUser(ctx.userId, {
      publicMetadata: {
        ...ctx.user.publicMetadata,
        customProfileImageUrl: null,
      },
    });

    const updatedUser = await clerk.users.getUser(ctx.userId);
    await syncUserFromClerk(updatedUser);

    return {
      success: true,
      message: 'Profile image deleted successfully',
    };
  }),
```

**Helper Function:**

```typescript
// lib/utils.ts (add this utility)
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });
}
```

**Files to Delete:**

- `app/api/upload/profile-image/route.ts`

**Files to Modify:**

- `lib/utils.ts` (add fileToBase64 helper)
- `lib/trpc/routers/user.ts` (add procedures)

---

### Phase 2: Hooks Updates

#### Ticket 3: Update Notification Settings Hook

**Priority:** High  
**Estimated Time:** 1 hour  
**Depends On:** Ticket 1

**Tasks:**

1. Update `hooks/use-notification-settings.ts` to use tRPC
2. Remove old fetch implementation
3. Test settings page

**Files to Modify:**

- `hooks/use-notification-settings.ts`

**Example Update:**

```typescript
// hooks/use-notification-settings.ts
import { trpc } from '@/lib/trpc/client';
import { useToast } from './use-toast';

export function useNotificationSettings() {
  const { toast } = useToast();
  const utils = trpc.useContext();

  const { data: settings, isLoading } = trpc.user.getNotificationSettings.useQuery();

  const updateSettings = trpc.user.updateNotificationSettings.useMutation({
    onSuccess: () => {
      utils.user.getNotificationSettings.invalidate();
      toast({
        title: 'Settings Updated',
        description: 'Your notification settings have been updated',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  return {
    settings,
    isLoading,
    updateSettings: updateSettings.mutate,
    isUpdating: updateSettings.isPending,
  };
}
```

---

#### Ticket 4: Update Profile Upload Hook

**Priority:** High  
**Estimated Time:** 1 hour  
**Depends On:** Ticket 2

**Tasks:**

1. Update `hooks/use-profile-upload.ts` to use tRPC
2. Add base64 conversion logic
3. Remove old fetch implementation
4. Test profile image upload/delete

**Files to Modify:**

- `hooks/use-profile-upload.ts`

**Example Update:**

```typescript
// hooks/use-profile-upload.ts
import { trpc } from '@/lib/trpc/client';
import { useToast } from './use-toast';
import { fileToBase64 } from '@/lib/utils';

export function useProfileUpload() {
  const { toast } = useToast();
  const utils = trpc.useContext();

  const uploadMutation = trpc.user.uploadProfileImage.useMutation({
    onSuccess: () => {
      utils.user.getProfile.invalidate();
      toast({
        title: 'Profile Updated',
        description: 'Your profile image has been updated',
      });
    },
    onError: (error) => {
      toast({
        title: 'Upload Failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const deleteMutation = trpc.user.deleteProfileImage.useMutation({
    onSuccess: () => {
      utils.user.getProfile.invalidate();
      toast({
        title: 'Image Deleted',
        description: 'Your profile image has been deleted',
      });
    },
  });

  const handleUpload = async (file: File) => {
    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: 'Invalid File Type',
        description: 'Please upload a JPEG, PNG, or WebP image',
        variant: 'destructive',
      });
      return;
    }

    // Convert to base64
    const fileBase64 = await fileToBase64(file);

    await uploadMutation.mutateAsync({
      fileBase64,
      fileName: file.name,
      mimeType: file.type as 'image/jpeg' | 'image/png' | 'image/webp',
    });
  };

  return {
    handleUpload,
    handleDelete: deleteMutation.mutate,
    isUploading: uploadMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}
```

---

### Phase 3: Testing & Cleanup

#### Ticket 5: Update Tests for User Router

**Priority:** High  
**Estimated Time:** 2 hours  
**Depends On:** Tickets 1-4

**Tasks:**

1. Update existing tests to mock tRPC procedures
2. Add new tests for user router
3. Test error handling and edge cases
4. Ensure coverage for user router paths

**Files to Modify:**

- `__tests__/hooks/use-auth-actions.test.tsx`

**Files to Create:**

- `__tests__/lib/trpc/routers/user.test.ts`

**Test Pattern:**

```typescript
// __tests__/lib/trpc/routers/user.test.ts
import { appRouter } from '@/lib/trpc/router';
import { createCallerFactory } from '@trpc/server';

describe('User Router', () => {
  const createCaller = createCallerFactory(appRouter);

  it('should get notification settings', async () => {
    const caller = createCaller({
      userId: 'test-user',
      user: mockClerkUser,
      localUser: mockLocalUser,
    });

    const result = await caller.user.getNotificationSettings();

    expect(result).toHaveProperty('emailNotifications');
    expect(result).toHaveProperty('marketingEmails');
    expect(result).toHaveProperty('securityAlerts');
  });

  it('should update notification settings', async () => {
    const caller = createCaller({
      userId: 'test-user',
      user: mockClerkUser,
      localUser: mockLocalUser,
    });

    const newSettings = {
      emailNotifications: false,
      marketingEmails: true,
      securityAlerts: true,
    };

    const result = await caller.user.updateNotificationSettings(newSettings);

    expect(result).toEqual(newSettings);
  });

  it('should sync user data', async () => {
    const caller = createCaller({
      userId: 'test-user',
      user: mockClerkUser,
      localUser: mockLocalUser,
    });

    const result = await caller.user.sync();

    expect(result.success).toBe(true);
    expect(result.user).toHaveProperty('localId');
    expect(result.user).toHaveProperty('id');
  });

  it('should upload profile image', async () => {
    const caller = createCaller({
      userId: 'test-user',
      user: mockClerkUser,
      localUser: mockLocalUser,
    });

    const mockBase64 =
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

    const result = await caller.user.uploadProfileImage({
      fileBase64: mockBase64,
      fileName: 'test.png',
      mimeType: 'image/png',
    });

    expect(result.success).toBe(true);
    expect(result.imageUrl).toBeDefined();
  });

  it('should delete profile image', async () => {
    const caller = createCaller({
      userId: 'test-user',
      user: { ...mockClerkUser, imageUrl: 'https://example.com/image.png' },
      localUser: mockLocalUser,
    });

    const result = await caller.user.deleteProfileImage();

    expect(result.success).toBe(true);
  });
});
```

---

#### Ticket 6: Documentation & Cleanup

**Priority:** Medium  
**Estimated Time:** 1 hour  
**Depends On:** All previous tickets

**Tasks:**

1. Update README.md with tRPC user router usage examples
2. Document tRPC procedures in code comments
3. Delete all migrated REST endpoint files
4. Update API documentation
5. Create migration completion checklist

**Files to Modify:**

- `README.md` (update API section)
- `.cursor/rules/general.mdc` (update with user router tRPC patterns)

**Files to Delete:**

- `app/api/user/notification-settings/route.ts`
- ~~`app/api/user/sync/route.ts`~~ (already deleted - unused endpoint)
- `app/api/upload/profile-image/route.ts`

**Documentation to Add:**

````markdown
### User Router Examples

#### Notification Settings

```typescript
// Get notification settings
const { data: settings } = trpc.user.getNotificationSettings.useQuery();

// Update notification settings
const updateSettings = trpc.user.updateNotificationSettings.useMutation();
await updateSettings.mutateAsync({
  emailNotifications: true,
  marketingEmails: false,
  securityAlerts: true,
});
```
````

#### Profile Image Upload

```typescript
// Upload profile image
const upload = trpc.user.uploadProfileImage.useMutation();
const base64 = await fileToBase64(file);
await upload.mutateAsync({
  fileBase64: base64,
  fileName: file.name,
  mimeType: file.type,
});

// Delete profile image
const deleteImage = trpc.user.deleteProfileImage.useMutation();
await deleteImage.mutateAsync();
```

```

---

## Migration Order

Follow this order to minimize breaking changes:

1. **Phase 1: User Router Setup** (Tickets 1-2)
   - Set up user router infrastructure
   - Migrate notification settings endpoints
   - Migrate profile image upload (most complex)

2. **Phase 2: Hooks Updates** (Tickets 3-4)
   - Update client-side code to use new tRPC procedures
   - Test all UI flows

3. **Phase 3: Testing & Cleanup** (Tickets 5-6)
   - Comprehensive testing
   - Remove old code
   - Update documentation

---

## Success Criteria

- ✅ All active user-facing endpoints migrated to tRPC
- ✅ Full end-to-end type safety for all API calls
- ✅ All tests passing
- ✅ Zero breaking changes for users
- ✅ Documentation updated
- ✅ Old REST endpoint files deleted
- ✅ Profile image upload works with base64 encoding
- ✅ Unused `/api/user/sync` endpoint identified and removed (syncing happens automatically)

---

## Rollback Plan

If issues arise:

1. **Per-endpoint rollback:** Keep REST files until tRPC procedure is fully tested
2. **Feature flags:** Use environment variable to toggle between REST/tRPC
3. **Gradual migration:** Deploy one procedure at a time, monitor for issues
4. **Database unchanged:** No schema changes required for this migration

---

## Benefits After Migration

1. **Type Safety:** Compile-time errors for API mismatches
2. **Better DX:** IDE autocomplete for all API calls
3. **Consistent Patterns:** All business logic uses same pattern
4. **Easier Testing:** Mock tRPC procedures instead of fetch calls
5. **Performance:** Built-in request batching and deduplication
6. **Maintainability:** Single source of truth for API contracts

---

## Estimated Total Time

- **Phase 1:** 3.5 hours (Tickets 1-2)
- **Phase 2:** 2 hours (Tickets 3-4)
- **Phase 3:** 3 hours (Tickets 5-6)

**Total: ~8.5 hours** (approximately 1 work day)

---

## Technical Notes

### Base64 File Upload
- tRPC doesn't support multipart form data natively
- Solution: Convert files to base64 strings for transmission
- Size limit: 5MB (accounts for base64 encoding overhead)
- Supported formats: JPEG, PNG, WebP

### Profile Image Flow
1. User selects file in UI
2. Convert file to base64 using `fileToBase64()` helper
3. Send base64 string + metadata to tRPC mutation
4. Server converts base64 back to buffer
5. Upload to Vercel Blob storage
6. Update Clerk user metadata
7. Sync to local database

### Notification Settings Storage
- Stored as JSON string in database
- Validated with Zod schema
- Default settings provided for new users
- Graceful fallback for malformed JSON
```
