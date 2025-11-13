import { Section, Text, Hr } from '@react-email/components';
import { BaseLayout } from '@/lib/email/templates';
import type { OTPType, OTPEmailProps } from '@/lib/auth';

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
        <Text className="text-3xl font-bold text-stone-900 mb-4 mt-0 text-center">
          {content.heading}
        </Text>
        <Text className="text-base text-stone-600 mb-0 leading-relaxed text-center">
          {content.description}
        </Text>
      </Section>

      {/* OTP Code Section */}
      <Section className="bg-stone-50 rounded-lg p-8 mb-8 text-center">
        <Text className="text-5xl font-bold text-stone-900 tracking-widest m-0 font-mono">
          {otp}
        </Text>
      </Section>

      {/* Expiration Notice */}
      <Section className="mb-8">
        <Text className="text-sm text-stone-500 text-center mb-0">
          ⏱️ This code will expire in 5 minutes.
        </Text>
      </Section>

      <Hr className="border-stone-200 my-6" />

      {/* Security Notice */}
      <Section>
        <Text className="text-xs text-stone-500 text-center">
          If you didn&apos;t request this code, you can safely ignore this email.
        </Text>
      </Section>
    </BaseLayout>
  );
}
