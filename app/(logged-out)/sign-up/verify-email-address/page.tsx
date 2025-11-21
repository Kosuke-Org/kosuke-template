import { OTPVerification } from '@/components/otp-verification';

export default function VerifyEmailAddressPage() {
  return (
    <div className="flex w-full max-w-sm flex-1 flex-col justify-center self-center">
      <OTPVerification />
    </div>
  );
}
