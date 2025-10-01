import { SignUp } from '@clerk/nextjs';

export default function Page() {
  return (
    <div className="flex items-center justify-center py-12">
      <SignUp afterSignUpUrl="/onboarding" />
    </div>
  );
}
