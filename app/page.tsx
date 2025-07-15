import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';

export default async function Home() {
  const { userId } = await auth();

  if (userId) {
    redirect('/dashboard');
  } else {
    // Redirect to the home page in the logged-out route group
    // This will be handled by the proper (logged-out)/home/page.tsx
    redirect('/home');
  }
}
