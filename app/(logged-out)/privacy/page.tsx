import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function PrivacyPage() {
  return (
    <div className="bg-background min-h-screen pt-[60px]">
      <div className="container max-w-4xl px-4 pt-12 pb-16 sm:px-6 sm:pt-20">
        <div className="mb-8">
          <h1 className="text-4xl font-bold tracking-tight">Privacy Policy</h1>
          <p className="text-muted-foreground mt-2">
            Last updated:{' '}
            {new Date().toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </p>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Information We Collect</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-neutral dark:prose-invert max-w-none">
              <p>
                We collect information you provide directly to us, information we obtain
                automatically when you use our services, and information from other sources as
                described below.
              </p>
              <h4 className="mt-4 mb-2 text-lg font-semibold">Account Information</h4>
              <ul className="list-disc space-y-1 pl-6">
                <li>Name and email address</li>
                <li>Profile information you choose to provide</li>
                <li>Billing and payment information</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>How We Use Your Information</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-neutral dark:prose-invert max-w-none">
              <p>We use the information we collect to:</p>
              <ul className="list-disc space-y-1 pl-6">
                <li>Provide, maintain, and improve our services</li>
                <li>Process transactions and send related information</li>
                <li>Send technical notices and support messages</li>
                <li>Communicate with you about products, services, and events</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Information Sharing</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-neutral dark:prose-invert max-w-none">
              <p>
                We do not sell, trade, or otherwise transfer your personal information to third
                parties without your consent, except as described in this policy.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Data Security</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-neutral dark:prose-invert max-w-none">
              <p>
                We implement appropriate security measures to protect your personal information
                against unauthorized access, alteration, disclosure, or destruction.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Your Rights</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-neutral dark:prose-invert max-w-none">
              <p>You have the right to:</p>
              <ul className="list-disc space-y-1 pl-6">
                <li>Access your personal information</li>
                <li>Correct inaccurate information</li>
                <li>Delete your account and personal information</li>
                <li>Object to processing of your information</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Contact Us</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-neutral dark:prose-invert max-w-none">
              <p>
                If you have any questions about this Privacy Policy, please contact us at{' '}
                <a
                  href="mailto:privacy@kosuketemplate.com"
                  className="text-primary hover:underline"
                >
                  privacy@kosuketemplate.com
                </a>
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
