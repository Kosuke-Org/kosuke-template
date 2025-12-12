'use client';

import { useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';

import Link from 'next/link';

import { zodResolver } from '@hookform/resolvers/zod';
import { FileText, Loader2, Upload, X } from 'lucide-react';
import { z } from 'zod';

import { MAX_FILE_SIZE, SUPPORTED_MIME_TYPES, SupportedMimeType } from '@/lib/documents/constants';
import { uploadDocumentSchema } from '@/lib/trpc/schemas/documents';
import { formatBytes } from '@/lib/utils';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';

const uploadDocumentFormSchema = z.object({
  displayName: uploadDocumentSchema.shape.displayName,
  file: z
    .instanceof(File)
    .refine((file) => file.size <= MAX_FILE_SIZE, {
      message: 'File size must be less than 100MB',
    })
    .refine((file) => SUPPORTED_MIME_TYPES.includes(file.type as SupportedMimeType), {
      message: 'Unsupported file type. See supported file types.',
    }),
});

type UploadDocumentFormValues = z.infer<typeof uploadDocumentFormSchema>;

interface UploadDocumentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpload: (file: File, displayName: string) => Promise<void>;
  isUploading: boolean;
}

export function UploadDocumentDialog({
  open,
  onOpenChange,
  onUpload,
  isUploading,
}: UploadDocumentDialogProps) {
  const [dragActive, setDragActive] = useState(false);

  const form = useForm<UploadDocumentFormValues>({
    resolver: zodResolver(uploadDocumentFormSchema),
    defaultValues: {
      displayName: '',
    },
  });

  const selectedFile = useWatch({
    control: form.control,
    name: 'file',
  });

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      form.setValue('file', file, { shouldValidate: true });

      // Auto-fill display name if empty
      if (!form.getValues('displayName')) {
        form.setValue('displayName', file.name);
      }
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      form.setValue('file', file, { shouldValidate: true });

      // Auto-fill display name if empty
      if (!form.getValues('displayName')) {
        form.setValue('displayName', file.name);
      }
    }
  };

  const handleRemoveFile = () => {
    form.setValue('file', undefined as unknown as File);
  };

  const onSubmit = async (data: UploadDocumentFormValues) => {
    await onUpload(data.file, data.displayName);
    form.reset();
    onOpenChange(false);
  };

  const handleClose = () => {
    if (!isUploading) {
      form.reset();
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Upload Document</DialogTitle>
          <DialogDescription>
            Upload a document to your organization&apos;s knowledge base for AI-powered search and
            chat.
          </DialogDescription>
        </DialogHeader>

        <form id="upload-document-form" onSubmit={form.handleSubmit(onSubmit)}>
          <FieldGroup>
            {/* Display Name Field */}
            <Controller
              name="displayName"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="display-name">Document Title</FieldLabel>
                  <Input
                    {...field}
                    id="display-name"
                    aria-invalid={fieldState.invalid}
                    placeholder="Enter document title"
                    disabled={isUploading}
                  />
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />

            {/* File Upload Field */}
            <Controller
              name="file"
              control={form.control}
              render={({ fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel>File</FieldLabel>
                  <FieldContent>
                    {!selectedFile ? (
                      <div
                        className={`rounded-lg border-2 border-dashed p-8 text-center transition-colors ${
                          dragActive
                            ? 'border-primary bg-accent'
                            : 'border-border hover:border-primary/50 hover:bg-accent/50'
                        }`}
                        onDragEnter={handleDrag}
                        onDragLeave={handleDrag}
                        onDragOver={handleDrag}
                        onDrop={handleDrop}
                      >
                        <Upload className="text-muted-foreground mx-auto mb-4 h-8 w-8" />
                        <p className="mb-1 mb-4 text-sm font-medium">
                          Drag and drop your file here, or click to browse
                        </p>

                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => document.getElementById('file-input')?.click()}
                          disabled={isUploading}
                        >
                          Browse Files
                        </Button>
                        <input
                          id="file-input"
                          type="file"
                          onChange={handleFileSelect}
                          accept={SUPPORTED_MIME_TYPES.join(',')}
                          className="hidden"
                          disabled={isUploading}
                        />
                      </div>
                    ) : (
                      <div className="flex items-center justify-between rounded-lg border p-4">
                        <div className="flex min-w-0 flex-1 items-center gap-3">
                          <FileText className="text-muted-foreground h-5 w-5 shrink-0" />
                          <div className="flex min-w-0 flex-col">
                            <p className="truncate text-sm font-medium">{selectedFile.name}</p>
                            <p className="text-muted-foreground text-xs">
                              {formatBytes(selectedFile.size)}
                            </p>
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={handleRemoveFile}
                          disabled={isUploading}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                    <FieldDescription>
                      Maximum file size: {formatBytes(MAX_FILE_SIZE)}.{' '}
                      <Link
                        href="https://ai.google.dev/gemini-api/docs/file-search#supported-files"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        See supported file types
                      </Link>
                      .
                    </FieldDescription>
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </FieldContent>
                </Field>
              )}
            />

            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={handleClose} disabled={isUploading}>
                Cancel
              </Button>
              <Button type="submit" disabled={isUploading}>
                {isUploading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4" />
                )}
                Upload
              </Button>
            </div>
          </FieldGroup>
        </form>
      </DialogContent>
    </Dialog>
  );
}
