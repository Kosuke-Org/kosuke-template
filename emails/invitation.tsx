import { Button, Hr, Section, Text } from '@react-email/components';
import { formatDistanceToNow } from 'date-fns';

import { type InvitationEmailParams } from '@/lib/auth';
import { BaseLayout } from '@/lib/email/templates';

export default function InvitationEmail({
  inviter,
  invitation,
  organization,
  inviteLink,
}: InvitationEmailParams) {
  return (
    <BaseLayout preview="You have been invited to join an organization">
      {/* Heading */}

      <Section className="mb-8 rounded-lg bg-stone-50 p-8 text-center">
        <Text className="mt-0 mb-6 text-xl font-medium">
          {inviter.user.name} invited you to join {organization.name}
        </Text>
        <Button href={inviteLink} className="mb-6 rounded-md bg-stone-900 px-4 py-2 text-white">
          Accept Invitation
        </Button>
        <Text className="m-0 text-center text-stone-500">
          This invitation will expire in {formatDistanceToNow(invitation.expiresAt)}.
        </Text>
      </Section>

      <Hr className="my-6 border-stone-200" />

      {/* Security Notice */}
      <Section>
        <Text className="text-center text-sm text-stone-500">
          If you didn&apos;t request this invitation, you can safely ignore this email.
        </Text>
      </Section>
    </BaseLayout>
  );
}

const defaultProps: InvitationEmailParams = {
  id: '00000000-0000-0000-0000-000000000002',
  email: 'invitee@example.com',
  role: 'member',
  inviter: {
    id: '00000000-0000-0000-0000-000000000004',
    organizationId: '00000000-0000-0000-0000-000000000003',
    userId: '00000000-0000-0000-0000-000000000001',
    role: 'admin',
    createdAt: new Date(),
    user: {
      id: '00000000-0000-0000-0000-000000000001',
      name: 'Jane Smith',
      email: 'jane@example.com',
      emailVerified: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  },
  invitation: {
    id: '00000000-0000-0000-0000-000000000002',
    email: 'invitee@example.com',
    organizationId: '00000000-0000-0000-0000-000000000003',
    inviterId: '00000000-0000-0000-0000-000000000001',
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    role: 'member',
    status: 'pending',
    createdAt: new Date(),
  },
  organization: {
    id: '00000000-0000-0000-0000-000000000003',
    name: 'Acme Corporation',
    slug: 'acme-corp',
    createdAt: new Date(),
  },
  inviteLink: 'http://localhost:3000/accept-invitation/test-token-123',
};

InvitationEmail.PreviewProps = defaultProps;
