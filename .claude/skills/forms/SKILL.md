---
name: forms
description: React Hook Form reference - the modern Controller + Field pattern (not the legacy Form/FormField components), vertical/horizontal/read-only field layouts, a complete form example with tRPC mutation and dirty tracking, and when to use useWatch versus watch(). Load when building or editing any form.
---

# Forms (React Hook Form + Shadcn Field)

**For controlled forms (complex inputs, custom components, third-party libraries), use the modern Shadcn UI form pattern with `<Controller />` and `<Field />` components as documented at https://ui.shadcn.com/docs/forms/react-hook-form**

#### **Why This Pattern?**

- ✅ **Complete flexibility** - Full control over markup and styling
- ✅ **Better accessibility** - Proper ARIA attributes and semantic HTML
- ✅ **Performant** - React Hook Form's optimized re-rendering
- ✅ **Type-safe** - Full TypeScript support with Zod validation
- ✅ **Modern approach** - Follows current Shadcn UI best practices

#### **🔧 Basic Form Structure**

```typescript
'use client';

import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

const formSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  email: z.string().email('Enter a valid email address'),
});

export function ExampleForm() {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      email: '',
    },
  });

  function onSubmit(data: z.infer<typeof formSchema>) {
    // Handle form submission
    console.log(data);
  }

  return (
    <form id="example-form" onSubmit={form.handleSubmit(onSubmit)}>
      <FieldGroup>
        <Controller
          name="name"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="name">Name</FieldLabel>
              <Input
                {...field}
                id="name"
                aria-invalid={fieldState.invalid}
                placeholder="Enter your name"
              />
              <FieldDescription>Your full name</FieldDescription>
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />

        <Button type="submit">Submit</Button>
      </FieldGroup>
    </form>
  );
}
```

#### **🏗️ Key Components**

**Controller (from React Hook Form):**

- Wraps controlled inputs for integration with React Hook Form
- Provides `field` (value, onChange, onBlur, ref) and `fieldState` (invalid, error)
- Renders a function that receives field state

**Field Components:**

- `<Field />` - Container with validation state (`data-invalid` attribute)
- `<FieldLabel />` - Accessible label with proper `htmlFor` attribute
- `<FieldDescription />` - Helper text below the input
- `<FieldError />` - Error message display (conditionally rendered)
- `<FieldGroup />` - Groups multiple fields with consistent spacing
- `<FieldContent />` - For complex field layouts (horizontal orientation)

#### **📋 Form Patterns**

**Standard Vertical Field:**

```typescript
<Controller
  name="title"
  control={form.control}
  render={({ field, fieldState }) => (
    <Field data-invalid={fieldState.invalid}>
      <FieldLabel htmlFor="title">Title</FieldLabel>
      <Input
        {...field}
        id="title"
        aria-invalid={fieldState.invalid}
        placeholder="Enter title"
      />
      <FieldDescription>A descriptive title</FieldDescription>
      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
    </Field>
  )}
/>
```

**Horizontal Field (Switch/Toggle):**

```typescript
<Controller
  name="emailVerified"
  control={form.control}
  render={({ field }) => (
    <Field orientation="horizontal">
      <FieldContent>
        <FieldLabel htmlFor="email-verified">Email Verified</FieldLabel>
        <FieldDescription>
          Whether the user's email address is verified
        </FieldDescription>
      </FieldContent>
      <Switch
        id="email-verified"
        checked={field.value}
        onCheckedChange={field.onChange}
      />
    </Field>
  )}
/>
```

**Read-Only Field:**

```typescript
<Field>
  <FieldLabel>User ID</FieldLabel>
  <div className="font-mono text-sm">{user.id}</div>
  <FieldDescription>This cannot be changed</FieldDescription>
</Field>
```

#### **✅ Complete Example**

```typescript
'use client';

import { Controller, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { z } from 'zod';

import { trpc } from '@/lib/trpc/client';
import { updateUserSchema } from '@/lib/trpc/schemas/admin';

import { useToast } from '@/hooks/use-toast';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';

type UserFormValues = z.infer<typeof updateUserSchema>;

export function UserSettingsForm({ user }: { user: User }) {
  const { toast } = useToast();
  const utils = trpc.useUtils();

  const form = useForm<Omit<UserFormValues, 'id'>>({
    resolver: zodResolver(updateUserSchema.omit({ id: true })),
    values: {
      displayName: user.displayName || '',
      emailVerified: user.emailVerified || false,
    },
  });

  const updateUserMutation = trpc.admin.users.update.useMutation({
    onSuccess: () => {
      toast({ title: 'Success', description: 'User updated successfully' });
      utils.admin.users.get.invalidate({ id: user.id });
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const onSubmit = async (data: Omit<UserFormValues, 'id'>) => {
    await updateUserMutation.mutateAsync({ id: user.id, ...data });
  };

  // Track changes to enable/disable submit button
  const watchedDisplayName = useWatch({ control: form.control, name: 'displayName' });
  const watchedEmailVerified = useWatch({ control: form.control, name: 'emailVerified' });

  const hasChanges =
    watchedDisplayName !== user.displayName ||
    watchedEmailVerified !== user.emailVerified;

  return (
    <Card>
      <CardHeader>
        <CardTitle>User Information</CardTitle>
      </CardHeader>
      <CardContent>
        <form id="user-form" onSubmit={form.handleSubmit(onSubmit)}>
          <FieldGroup>
            <Controller
              name="displayName"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="display-name">Display Name</FieldLabel>
                  <Input
                    {...field}
                    id="display-name"
                    aria-invalid={fieldState.invalid}
                    placeholder="Enter display name"
                    disabled={updateUserMutation.isPending}
                  />
                  <FieldDescription>The user's display name</FieldDescription>
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />

            <Controller
              name="emailVerified"
              control={form.control}
              render={({ field }) => (
                <Field orientation="horizontal">
                  <FieldContent>
                    <FieldLabel htmlFor="email-verified">Email Verified</FieldLabel>
                    <FieldDescription>
                      Whether the user's email address is verified
                    </FieldDescription>
                  </FieldContent>
                  <Switch
                    id="email-verified"
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    disabled={updateUserMutation.isPending}
                  />
                </Field>
              )}
            />

            <Field>
              <FieldLabel>Email</FieldLabel>
              <div className="text-sm">{user.email}</div>
              <FieldDescription>Email address cannot be changed</FieldDescription>
            </Field>

            <Button type="submit" disabled={updateUserMutation.isPending || !hasChanges}>
              {updateUserMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
}
```

#### **❌ WRONG - Legacy Form Pattern**

```typescript
// ❌ NO! Don't use the legacy Form components
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';

<Form {...form}>
  <form onSubmit={form.handleSubmit(onSubmit)}>
    <FormField
      control={form.control}
      name="name"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Name</FormLabel>
          <FormControl>
            <Input {...field} />
          </FormControl>
          <FormDescription>Your name</FormDescription>
          <FormMessage />
        </FormItem>
      )}
    />
  </form>
</Form>
```

#### **✅ CORRECT - Modern Field Pattern**

```typescript
// ✅ YES! Use Controller + Field components
import { Controller } from 'react-hook-form';
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field';

<form id="example-form" onSubmit={form.handleSubmit(onSubmit)}>
  <FieldGroup>
    <Controller
      name="name"
      control={form.control}
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid}>
          <FieldLabel htmlFor="name">Name</FieldLabel>
          <Input
            {...field}
            id="name"
            aria-invalid={fieldState.invalid}
          />
          <FieldDescription>Your name</FieldDescription>
          {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
        </Field>
      )}
    />
  </FieldGroup>
</form>
```

### React Hook Form - watch vs useWatch

**PREFER `useWatch` for reactive form values in render phase. Use `watch()` only in callbacks.**

#### **✅ WHEN TO USE useWatch**

- **Render phase reactive values** - Displaying or computing values during render
- **Derived/computed values** - Calculations based on form fields
- **Performance optimization** - Large forms with many fields
- **Component isolation** - Isolating re-renders to specific components

#### **✅ WHEN TO USE watch()**

- **Event handlers** - Inside onClick, onSubmit, onChange callbacks
- **Imperative reads** - Getting values without subscribing to changes
- **Multiple fields at once** - `watch(['field1', 'field2'])` for batching

#### **🔧 Implementation Patterns**

**✅ CORRECT - useWatch for render phase:**

```typescript
import { useWatch } from 'react-hook-form';

function OrgGeneralForm() {
  const form = useForm({ defaultValues: { name: organization?.name } });

  // ✅ Reactive value for render phase - optimized re-renders
  const watchedName = useWatch({
    control: form.control,
    name: 'name',
  });

  const hasChanges = watchedName !== organization?.name;

  return (
    <Button disabled={!hasChanges}>Save</Button>
  );
}
```

**✅ CORRECT - watch() for callbacks:**

```typescript
function OrgGeneralForm() {
  const form = useForm();

  const handlePreview = () => {
    // ✅ Imperative read in callback - no subscription needed
    const currentName = form.watch('name');
    console.log('Current name:', currentName);
  };

  return <Button onClick={handlePreview}>Preview</Button>;
}
```

**❌ WRONG - watch() for reactive render values:**

```typescript
function OrgGeneralForm() {
  const form = useForm();

  // ❌ Causes entire component to re-render on every field change
  const hasChanges = form.watch('name') !== organization?.name;

  return <Button disabled={!hasChanges}>Save</Button>;
}
```

#### **Performance Benefits:**

- ✅ `useWatch` isolates re-renders to subscription point
- ✅ Prevents unnecessary parent component re-renders
- ✅ Better performance in large forms or complex UIs
- ✅ More predictable render behavior
