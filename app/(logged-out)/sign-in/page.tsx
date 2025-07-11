import { redirect } from 'next/navigation';

export default function SignInPage() {
  // Redirect to Stack's sign-in handler
  redirect('/handler/sign-in');
}
