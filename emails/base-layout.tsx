import {
  Html,
  Head,
  Preview,
  Body,
  Container,
  Section,
  Text,
  Hr,
  Link,
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
          <Container className="mx-auto py-5 px-0 max-w-[600px]">
            <Section className="bg-white rounded-xl p-10 shadow-lg">
              {/* Header */}
              <Section className="text-center mb-10">
                <Text className="text-3xl font-black text-stone-900 mb-2 m-0">Kosuke Template</Text>
                <Text className="text-base text-stone-500 m-0">Modern Next.js Template</Text>
              </Section>

              {/* Main Content */}
              {children}

              {/* Footer */}
              <Hr className="border-stone-200 my-6" />
              <Section className="text-center">
                <Text className="text-sm text-stone-500 mb-4">
                  Need help getting started? We&apos;re here to help!
                </Text>
                <Text className="text-sm text-stone-500 mb-6">
                  <Link href="#" className="text-stone-900 no-underline mx-3">
                    Documentation
                  </Link>
                  <Link href="#" className="text-stone-900 no-underline mx-3">
                    Support
                  </Link>
                  <Link href="#" className="text-stone-900 no-underline mx-3">
                    Community
                  </Link>
                </Text>
                <Text className="text-xs text-stone-500 mt-6">
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
