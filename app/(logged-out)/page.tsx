import { Home } from '@/components/home';
import { HomepageStructuredData } from '@/components/structured-data';

export default function RootPage() {
  return (
    <>
      <HomepageStructuredData />
      <Home />
    </>
  );
}
