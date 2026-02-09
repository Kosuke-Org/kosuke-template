import { Button, Hr, Section, Text } from '@react-email/components';

import { BaseLayout } from './base-layout';

interface WaitlistConfirmationEmailProps {
  email: string;
}

export const WaitlistConfirmationEmail = ({ email }: WaitlistConfirmationEmailProps) => {
  return (
    <BaseLayout preview="Welcome to the Kosuke Template Waitlist!">
      {/* Welcome Message */}
      <Section className="mb-8">
        <Text className="mt-0 mb-4 text-3xl font-bold text-stone-900">
          You&apos;re on the list! 🎉
        </Text>
        <Text className="mb-4 text-base leading-relaxed text-stone-600">
          Thank you for joining the Kosuke Template early access waitlist! We&apos;re thrilled to
          have you as one of our early supporters.
        </Text>
        <Text className="mb-0 text-base leading-relaxed text-stone-600">
          Your email (<strong>{email}</strong>) has been successfully added to our waitlist.
        </Text>
      </Section>

      {/* What to Expect */}
      <Section className="mb-8 rounded-lg bg-stone-50 p-6">
        <Text className="mt-0 mb-4 text-xl font-semibold text-stone-900">
          What to expect next
        </Text>
        <Text className="mb-3 text-sm leading-relaxed text-stone-600">
          <strong>Early Access:</strong> You&apos;ll be among the first to get access to new
          features, updates, and exclusive content.
        </Text>
        <Text className="mb-3 text-sm leading-relaxed text-stone-600">
          <strong>Timeline:</strong> We&apos;ll be reaching out with early access details in the
          coming weeks. Keep an eye on your inbox!
        </Text>
        <Text className="mb-0 text-sm leading-relaxed text-stone-600">
          <strong>Stay Updated:</strong> Follow our progress and get the latest updates on our
          development journey.
        </Text>
      </Section>

      {/* Social Links */}
      <Section className="mb-8 text-center">
        <Text className="mb-4 text-base font-semibold text-stone-900">Stay Connected</Text>
        <Button
          href="https://github.com/Kosuke-Org/kosuke-template"
          className="mb-2 mr-3 inline-block rounded-lg bg-stone-900 px-6 py-3 font-semibold text-white no-underline"
        >
          Star on GitHub
        </Button>
        <Button
          href="https://github.com/Kosuke-Org/kosuke-template#readme"
          className="mb-2 ml-3 inline-block rounded-lg bg-stone-600 px-6 py-3 font-semibold text-white no-underline"
        >
          View Docs
        </Button>
      </Section>

      <Hr className="my-6 border-stone-200" />

      <Section>
        <Text className="text-center text-xs text-stone-500">
          This email was sent to {email} because you joined our waitlist. If you didn&apos;t sign
          up or want to unsubscribe, you can safely ignore this email.
        </Text>
      </Section>
    </BaseLayout>
  );
};
