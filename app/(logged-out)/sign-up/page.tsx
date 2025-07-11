import { redirect } from 'next/navigation';

export default function SignUpPage() {
  // Redirect to Stack's sign-up handler
  redirect('/handler/sign-up');
}
