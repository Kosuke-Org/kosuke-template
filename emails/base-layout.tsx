import {
  Body,
  Container,
  Head,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from '@react-email/components';
import { Tailwind } from '@react-email/tailwind';

interface BaseLayoutProps {
  preview: string;
  children: React.ReactNode;
}

export function BaseLayout({ preview, children }: BaseLayoutProps) {
  return (
    <Html>
      <Head />
      <Preview>{preview}</Preview>
      <Tailwind>
        <Body className="bg-stone-50 font-sans">
          <Container className="mx-auto max-w-[600px] px-0 py-5">
            <Section className="rounded-xl bg-white p-10 shadow-lg">
              {/* Header */}
              <Section className="mb-10 text-center">
                <Text className="m-0 mb-2 text-3xl font-black text-stone-900">Test</Text>
              </Section>

              {/* Main Content */}
              {children}

              {/* Footer */}
              <Hr className="my-6 border-stone-200" />
              <Section className="text-center">
                <Text className="mb-4 text-sm text-stone-500">
                  Need help getting started? We&apos;re here to help!
                </Text>
                <Text className="mb-6 text-sm text-stone-500">
                  <Link href="#" className="mx-3 text-stone-900 no-underline">
                    Documentation
                  </Link>
                  <Link href="#" className="mx-3 text-stone-900 no-underline">
                    Support
                  </Link>
                  <Link href="#" className="mx-3 text-stone-900 no-underline">
                    Community
                  </Link>
                </Text>
                <Text className="mt-6 text-xs text-stone-500">
                  Just reply to this email—we&apos;re always happy to help out.
                </Text>
              </Section>
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}
