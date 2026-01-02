'use client';

import { useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';

import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { z } from 'zod';

import { trpc } from '@/lib/trpc/client';
import { updateRagSettingsSchema } from '@/lib/trpc/schemas/rag';

import { useToast } from '@/hooks/use-toast';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';

// Form values type (omit organizationId as it's selected separately)
type RagSettingsFormValues = Omit<z.infer<typeof updateRagSettingsSchema>, 'organizationId'>;

function RagSettingsPageSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-96" />
      </div>
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent className="space-y-6">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-3 w-48" />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

export default function AdminRagSettingsPage() {
  const { toast } = useToast();
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);

  const { data: orgsData, isLoading: isLoadingOrgs } = trpc.admin.organizations.list.useQuery(
    { page: 1, pageSize: 100 },
    { staleTime: 1000 * 60 * 5 }
  );

  const { data: settings, isLoading: isLoadingSettings } = trpc.admin.rag.getSettings.useQuery(
    { organizationId: selectedOrgId! },
    {
      enabled: !!selectedOrgId,
      staleTime: 1000 * 60 * 2,
    }
  );

  const utils = trpc.useUtils();

  const form = useForm<RagSettingsFormValues>({
    resolver: zodResolver(updateRagSettingsSchema.omit({ organizationId: true })),
    values: {
      systemPrompt: settings?.systemPrompt ?? null,
      maxOutputTokens: settings?.maxOutputTokens ?? null,
      temperature: settings?.temperature ?? null,
      topP: settings?.topP ?? null,
      topK: settings?.topK ?? null,
    },
  });

  const updateSettings = trpc.admin.rag.updateSettings.useMutation({
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'RAG settings updated successfully',
      });
      utils.admin.rag.getSettings.invalidate({ organizationId: selectedOrgId! });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const onSubmit = async (data: RagSettingsFormValues) => {
    if (!selectedOrgId || !form.formState.isValid) return;

    await updateSettings.mutateAsync({
      organizationId: selectedOrgId,
      ...data,
    });
  };

  const watchedValues = useWatch({
    control: form.control,
  });

  const hasChanges =
    watchedValues.systemPrompt !== settings?.systemPrompt ||
    watchedValues.maxOutputTokens !== settings?.maxOutputTokens ||
    watchedValues.temperature !== settings?.temperature ||
    watchedValues.topP !== settings?.topP ||
    watchedValues.topK !== settings?.topK;

  const handleReset = () => {
    form.reset({
      systemPrompt: settings?.systemPrompt ?? null,
      maxOutputTokens: settings?.maxOutputTokens ?? null,
      temperature: settings?.temperature ?? null,
      topP: settings?.topP ?? null,
      topK: settings?.topK ?? null,
    });
  };

  if (isLoadingOrgs) {
    return <RagSettingsPageSkeleton />;
  }

  return (
    <div className="max-w-5xl space-y-8 px-4 lg:px-0">
      <div className="flex justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold">RAG Settings</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Configure RAG (Retrieval-Augmented Generation) settings for your organizations
          </p>
        </div>

        <div className="flex items-center gap-4">
          <div className="max-w-md flex-1">
            <Select
              value={selectedOrgId ?? ''}
              onValueChange={(value) => setSelectedOrgId(value || null)}
            >
              <SelectTrigger aria-label="Select an organization">
                <SelectValue placeholder="Select an organization" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="select" disabled>
                  Select an organization
                </SelectItem>
                {orgsData?.organizations.map((org: { id: string; name: string; slug: string }) => (
                  <SelectItem key={org.id} value={org.id}>
                    {org.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {selectedOrgId && (
        <>
          {isLoadingSettings ? (
            <RagSettingsPageSkeleton />
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Model Configuration</CardTitle>
                <CardDescription>
                  Fine-tune how the AI responds to queries using your documents
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form id="rag-settings-form" onSubmit={form.handleSubmit(onSubmit)}>
                  <FieldGroup>
                    <Controller
                      name="systemPrompt"
                      control={form.control}
                      render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid}>
                          <FieldLabel htmlFor="system-prompt">System Prompt</FieldLabel>
                          <Textarea
                            {...field}
                            value={field.value ?? ''}
                            onChange={(e) => {
                              const val = e.target.value.trim();
                              field.onChange(val === '' ? null : val);
                            }}
                            id="system-prompt"
                            aria-invalid={fieldState.invalid}
                            placeholder="Enter system instructions for the AI model..."
                            rows={5}
                            disabled={updateSettings.isPending}
                            className="resize-none"
                          />
                          <FieldDescription>
                            Instructions for how the AI should respond. Maximum 10,000 characters.
                          </FieldDescription>
                          {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                        </Field>
                      )}
                    />

                    <div className="grid gap-6 sm:grid-cols-2">
                      <Controller
                        name="maxOutputTokens"
                        control={form.control}
                        render={({ field, fieldState }) => (
                          <Field data-invalid={fieldState.invalid}>
                            <FieldLabel htmlFor="max-output-tokens">Max Output Tokens</FieldLabel>
                            <Input
                              {...field}
                              value={field.value ?? ''}
                              onChange={(e) => {
                                const val = e.target.value;
                                field.onChange(val === '' ? null : parseInt(val, 10));
                              }}
                              id="max-output-tokens"
                              type="number"
                              min={1}
                              max={65535}
                              aria-invalid={fieldState.invalid}
                              placeholder="8192"
                              disabled={updateSettings.isPending}
                            />
                            <FieldDescription>
                              Maximum response length (1-65,535 tokens)
                            </FieldDescription>
                            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                          </Field>
                        )}
                      />

                      <Controller
                        name="temperature"
                        control={form.control}
                        render={({ field, fieldState }) => (
                          <Field data-invalid={fieldState.invalid}>
                            <FieldLabel htmlFor="temperature">Temperature</FieldLabel>
                            <Input
                              {...field}
                              value={field.value ?? ''}
                              onChange={(e) => {
                                const val = e.target.value;
                                field.onChange(val === '' ? null : parseFloat(val));
                              }}
                              id="temperature"
                              type="number"
                              step="0.1"
                              min={0}
                              max={2}
                              aria-invalid={fieldState.invalid}
                              placeholder="0.7"
                              disabled={updateSettings.isPending}
                            />
                            <FieldDescription>
                              Randomness: 0 (focused) to 2 (creative)
                            </FieldDescription>
                            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                          </Field>
                        )}
                      />

                      <Controller
                        name="topP"
                        control={form.control}
                        render={({ field, fieldState }) => (
                          <Field data-invalid={fieldState.invalid}>
                            <FieldLabel htmlFor="top-p">Top P</FieldLabel>
                            <Input
                              {...field}
                              value={field.value ?? ''}
                              onChange={(e) => {
                                const val = e.target.value;
                                field.onChange(val === '' ? null : parseFloat(val));
                              }}
                              id="top-p"
                              type="number"
                              step="0.01"
                              min={0}
                              max={1}
                              aria-invalid={fieldState.invalid}
                              placeholder="0.9"
                              disabled={updateSettings.isPending}
                            />
                            <FieldDescription>Nucleus sampling threshold (0-1)</FieldDescription>
                            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                          </Field>
                        )}
                      />

                      <Controller
                        name="topK"
                        control={form.control}
                        render={({ field, fieldState }) => (
                          <Field data-invalid={fieldState.invalid}>
                            <FieldLabel htmlFor="top-k">Top K</FieldLabel>
                            <Input
                              {...field}
                              value={field.value ?? ''}
                              onChange={(e) => {
                                const val = e.target.value;
                                field.onChange(val === '' ? null : parseInt(val, 10));
                              }}
                              id="top-k"
                              type="number"
                              min={1}
                              max={100}
                              aria-invalid={fieldState.invalid}
                              placeholder="40"
                              disabled={updateSettings.isPending}
                            />
                            <FieldDescription>Top K sampling (1-100, advanced)</FieldDescription>
                            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                          </Field>
                        )}
                      />
                    </div>

                    <div className="flex justify-end gap-2 pt-4">
                      <Button
                        variant="outline"
                        type="button"
                        onClick={handleReset}
                        disabled={!hasChanges || updateSettings.isPending}
                      >
                        Reset
                      </Button>
                      <Button type="submit" disabled={!hasChanges || updateSettings.isPending}>
                        {updateSettings.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                        Save Settings
                      </Button>
                    </div>
                  </FieldGroup>
                </form>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
