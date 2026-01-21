'use client';

import { ApiKeysConfigForm } from '@/components/apikeys-config-form';

export default function AdminAPIKeysConfigPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">API Keys</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Manage system-wide API keys for your application.
        </p>
      </div>

      <ApiKeysConfigForm />
    </div>
  );
}
