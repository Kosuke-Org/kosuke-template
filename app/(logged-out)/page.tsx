import { OriginProbe } from '@/components/origin-probe';

/**
 * The preview panel opens a sandbox at `/`, so the probe lives here: on this
 * branch the reproduction is the only thing the app is for, and a result that
 * needs a URL typed into it is not a result anybody watching the panel sees.
 */
export default function RootPage() {
  return <OriginProbe />;
}
