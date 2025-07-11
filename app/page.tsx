import { redirect } from 'next/navigation';
import { stackServerApp } from '../stack';

export default async function Home() {
  const user = await stackServerApp.getUser();

  if (user) {
    redirect('/dashboard');
  } else {
    // Redirect to the home page in the logged-out route group
    // This will be handled by the proper (logged-out)/home/page.tsx
    redirect('/home');
  }
}
