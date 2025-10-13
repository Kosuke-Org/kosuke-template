import { AUTH_ROUTES } from '@/lib/auth';
import { SignUp } from '@clerk/nextjs';

export default function Page() {
  return (
    <div className="flex items-center justify-center py-12">
      <SignUp fallbackRedirectUrl={AUTH_ROUTES.ONBOARDING} signInUrl={AUTH_ROUTES.SIGN_IN} />
    </div>
  );
}
