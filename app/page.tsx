import { redirect } from 'next/navigation';
import { getUser } from '@/lib/db/queries';

export default async function Home() {
  const user = await getUser();

  if (user) {
    redirect('/dashboard');
  } else {
    // Redirect to the home page in the logged-out route group
    // This will be handled by the proper (logged-out)/home/page.tsx
    redirect('/home');
  }
}
