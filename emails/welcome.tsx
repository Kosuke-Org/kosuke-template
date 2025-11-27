import { Button, Hr, Section, Text } from '@react-email/components';

import { BaseLayout } from '@/lib/email/templates';

interface WelcomeEmailProps {
  firstName: string;
  email: string;
  dashboardUrl?: string;
  settingsUrl?: string;
}

export const WelcomeEmail = ({
  firstName,
  email,
  dashboardUrl,
  settingsUrl,
}: WelcomeEmailProps) => {
  return (
    <BaseLayout preview={`Welcome to Kosuke Template, ${firstName}! 🎉`}>
      {/* Welcome Message */}
      <Section className="mb-8">
        <Text className="mt-0 mb-4 text-3xl font-bold text-stone-900">
          Welcome, {firstName}! 🎉
        </Text>
        <Text className="mb-4 text-base leading-relaxed text-stone-600">
          Thank you for joining Kosuke Template! We&apos;re excited to have you on board. Your
          account (<strong>{email}</strong>) has been successfully created.
        </Text>
        <Text className="mb-0 text-base leading-relaxed text-stone-600">
          You now have access to a powerful Next.js template with authentication, billing, beautiful
          UI components, and much more.
        </Text>
      </Section>

      {/* CTA Section */}
      {(dashboardUrl || settingsUrl) && (
        <Section className="mb-8 rounded-lg bg-stone-50 p-6 text-center">
          <Text className="mt-0 mb-6 text-xl font-semibold text-stone-900">Get Started</Text>
          {dashboardUrl && (
            <Button
              href={dashboardUrl}
              className="mr-3 mb-2 inline-block rounded-lg bg-stone-900 px-6 py-3 font-semibold text-white no-underline"
            >
              Go to Dashboard
            </Button>
          )}
          {settingsUrl && (
            <Button
              href={settingsUrl}
              className="mb-2 ml-3 inline-block rounded-lg bg-stone-600 px-6 py-3 font-semibold text-white no-underline"
            >
              Account Settings
            </Button>
          )}
        </Section>
      )}

      {/* Features Section */}
      <Section className="mb-8">
        <Text className="mb-4 text-xl font-semibold text-stone-900">What&apos;s included:</Text>

        {[
          'Next.js 16 with App Router and TypeScript',
          'Better Auth Authentication with user management',
          'Stripe Billing integration for subscriptions',
          'Beautiful Shadcn UI components',
          'PostgreSQL database with Drizzle ORM',
          'Dark/Light mode support',
          'File uploads with Vercel Blob',
          'Error monitoring with Sentry',
          'React Email for beautiful email templates',
        ].map((feature, index) => (
          <Text key={index} className="mb-3 flex items-center text-sm text-stone-600">
            <span className="mr-3 font-bold text-stone-900">✓</span>
            {feature}
          </Text>
        ))}
      </Section>

      <Hr className="my-6 border-stone-200" />

      <Section>
        <Text className="text-center text-xs text-stone-500">
          This email was sent to {email}. If you have any questions, just reply to this
          email—we&apos;re always happy to help out.
        </Text>
      </Section>
    </BaseLayout>
  );
};
