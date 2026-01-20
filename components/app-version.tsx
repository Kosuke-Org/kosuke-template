import { getAppVersion } from '@/lib/version';

export function AppVersion({ className }: { className?: string }) {
  const version = getAppVersion();

  if (!version) return null;

  return (
    <span className={className} suppressHydrationWarning>
      v{version}
    </span>
  );
}
