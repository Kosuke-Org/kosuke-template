import { Hr, Section, Text } from '@react-email/components';

import type { OTPEmailProps, OTPType } from '@/lib/auth';
import { BaseLayout } from '@/lib/email/templates';

type OTPTypeContent = { subject: string; heading: string; description: string };

const OTPContent: Record<OTPType, OTPTypeContent> = {
  'sign-in': {
    subject: 'Sign in to your account',
    heading: 'Sign In Verification',
    description: 'Use this code to sign in to your account.',
  },
  'email-verification': {
    subject: 'Verify your email address',
    heading: 'Email Verification',
    description: 'Use this code to verify your email address.',
  },
  'forget-password': {
    subject: 'Reset your password',
    heading: 'Password Reset',
    description: 'Use this code to reset your password.',
  },
};

export default function OTPEmail({ otp, type }: OTPEmailProps) {
  const content = OTPContent[type];

  return (
    <BaseLayout preview={content.description}>
      {/* Heading */}
      <Section className="mb-8">
        <Text className="mt-0 mb-4 text-center text-3xl font-bold text-stone-900">
          {content.heading}
        </Text>
        <Text className="mb-0 text-center text-base leading-relaxed text-stone-600">
          {content.description}
        </Text>
      </Section>

      {/* OTP Code Section */}
      <Section className="mb-8 rounded-lg bg-stone-50 p-8 text-center">
        <Text className="m-0 font-mono text-5xl font-bold tracking-widest text-stone-900">
          {otp}
        </Text>
      </Section>

      {/* Expiration Notice */}
      <Section className="mb-8">
        <Text className="mb-0 text-center text-sm text-stone-500">
          ⏱️ This code will expire in 5 minutes.
        </Text>
      </Section>

      <Hr className="my-6 border-stone-200" />

      {/* Security Notice */}
      <Section>
        <Text className="text-center text-xs text-stone-500">
          If you didn&apos;t request this code, you can safely ignore this email.
        </Text>
      </Section>
    </BaseLayout>
  );
}
