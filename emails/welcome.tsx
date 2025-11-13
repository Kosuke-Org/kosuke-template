import { Section, Text, Button, Hr } from '@react-email/components';
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
        <Text className="text-3xl font-bold text-stone-900 mb-4 mt-0">
          Welcome, {firstName}! 🎉
        </Text>
        <Text className="text-base text-stone-600 mb-4 leading-relaxed">
          Thank you for joining Kosuke Template! We&apos;re excited to have you on board. Your
          account (<strong>{email}</strong>) has been successfully created.
        </Text>
        <Text className="text-base text-stone-600 mb-0 leading-relaxed">
          You now have access to a powerful Next.js template with authentication, billing, beautiful
          UI components, and much more.
        </Text>
      </Section>

      {/* CTA Section */}
      {(dashboardUrl || settingsUrl) && (
        <Section className="bg-stone-50 rounded-lg p-6 mb-8 text-center">
          <Text className="text-xl font-semibold text-stone-900 mb-6 mt-0">Get Started</Text>
          {dashboardUrl && (
            <Button
              href={dashboardUrl}
              className="bg-stone-900 text-white px-6 py-3 rounded-lg font-semibold no-underline mr-3 mb-2 inline-block"
            >
              Go to Dashboard
            </Button>
          )}
          {settingsUrl && (
            <Button
              href={settingsUrl}
              className="bg-stone-600 text-white px-6 py-3 rounded-lg font-semibold no-underline ml-3 mb-2 inline-block"
            >
              Account Settings
            </Button>
          )}
        </Section>
      )}

      {/* Features Section */}
      <Section className="mb-8">
        <Text className="text-xl font-semibold text-stone-900 mb-4">What&apos;s included:</Text>

        {[
          'Next.js 15 with App Router and TypeScript',
          'Better Auth Authentication with user management',
          'Stripe Billing integration for subscriptions',
          'Beautiful Shadcn UI components',
          'PostgreSQL database with Drizzle ORM',
          'Dark/Light mode support',
          'File uploads with Vercel Blob',
          'Error monitoring with Sentry',
          'React Email for beautiful email templates',
        ].map((feature, index) => (
          <Text key={index} className="text-sm text-stone-600 mb-3 flex items-center">
            <span className="text-stone-900 font-bold mr-3">✓</span>
            {feature}
          </Text>
        ))}
      </Section>

      <Hr className="border-stone-200 my-6" />

      <Section>
        <Text className="text-xs text-stone-500 text-center">
          This email was sent to {email}. If you have any questions, just reply to this
          email—we&apos;re always happy to help out.
        </Text>
      </Section>
    </BaseLayout>
  );
};
