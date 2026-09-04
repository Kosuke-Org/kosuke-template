import { AdminConsole } from '@/components/admin-console';

/**
 * The preview panel opens a sandbox at `/`, so the screen under test lives here.
 */
export default function RootPage() {
  return <AdminConsole />;
}
