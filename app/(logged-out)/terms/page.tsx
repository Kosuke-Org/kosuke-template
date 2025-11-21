import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function TermsPage() {
  return (
    <div className="bg-background min-h-screen pt-[60px]">
      <div className="container max-w-4xl px-4 pt-12 pb-16 sm:px-6 sm:pt-20">
        <div className="mb-8">
          <h1 className="text-4xl font-bold tracking-tight">Terms of Service</h1>
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
              <CardTitle>Acceptance of Terms</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-neutral dark:prose-invert max-w-none">
              <p>
                By accessing and using Kosuke Template, you accept and agree to be bound by the
                terms and provision of this agreement. If you do not agree to abide by the above,
                please do not use this service.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Use License</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-neutral dark:prose-invert max-w-none">
              <p>
                Permission is granted to temporarily download one copy of Kosuke Template per device
                for personal, non-commercial transitory viewing only. This is the grant of a
                license, not a transfer of title, and under this license you may not:
              </p>
              <ul className="mt-4 list-disc space-y-1 pl-6">
                <li>Modify or copy the materials</li>
                <li>Use the materials for any commercial purpose or for any public display</li>
                <li>Attempt to reverse engineer any software contained in the service</li>
                <li>Remove any copyright or other proprietary notations from the materials</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>User Accounts</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-neutral dark:prose-invert max-w-none">
              <p>
                When you create an account with us, you must provide information that is accurate,
                complete, and current at all times. You are responsible for safeguarding the
                password and for keeping your account information current.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Billing and Subscriptions</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-neutral dark:prose-invert max-w-none">
              <p>
                Some parts of our service are billed on a subscription basis. You will be billed in
                advance on a recurring basis. Billing cycles are set on a monthly or annual basis,
                depending on the subscription plan selected.
              </p>
              <h4 className="mt-4 mb-2 text-lg font-semibold">Cancellation</h4>
              <p>
                You may cancel your subscription at any time. Upon cancellation, your subscription
                will remain active until the end of your current billing period.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Prohibited Uses</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-neutral dark:prose-invert max-w-none">
              <p>You may not use our service:</p>
              <ul className="list-disc space-y-1 pl-6">
                <li>For any unlawful purpose or to solicit others to unlawful acts</li>
                <li>
                  To violate any international, federal, provincial, or state regulations, rules,
                  laws, or local ordinances
                </li>
                <li>
                  To infringe upon or violate our intellectual property rights or the intellectual
                  property rights of others
                </li>
                <li>
                  To harass, abuse, insult, harm, defame, slander, disparage, intimidate, or
                  discriminate
                </li>
                <li>To submit false or misleading information</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Service Availability</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-neutral dark:prose-invert max-w-none">
              <p>
                We reserve the right to withdraw or amend our service, and any service or material
                we provide, in our sole discretion without notice. We do not warrant that our
                service will be uninterrupted, timely, secure, or error-free.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Limitation of Liability</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-neutral dark:prose-invert max-w-none">
              <p>
                In no case shall Kosuke Template, nor its directors, employees, partners, agents,
                suppliers, or affiliates, be liable for any indirect, incidental, punitive, special,
                or consequential damages arising out of or in connection with your use of the
                service.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Contact Information</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-neutral dark:prose-invert max-w-none">
              <p>
                If you have any questions about these Terms of Service, please contact us at{' '}
                <a href="mailto:legal@kosuketemplate.com" className="text-primary hover:underline">
                  legal@kosuketemplate.com
                </a>
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
