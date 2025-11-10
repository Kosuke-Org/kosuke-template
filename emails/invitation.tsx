import { Section, Text, Hr, Button } from '@react-email/components';
import { BaseLayout } from '@/lib/email/templates';
import { type InvitationEmailParams } from '@/lib/auth';
import { formatDistanceToNow } from 'date-fns';

export default function InvitationEmail({
  inviter,
  invitation,
  organization,
  inviteLink,
}: InvitationEmailParams) {
  return (
    <BaseLayout preview="You have been invited to join an organization">
      {/* Heading */}

      <Section className="bg-stone-50 rounded-lg p-8 mb-8 text-center">
        <Text className="text-xl font-bold text-stone-900 mb-6 mt-0">
          {inviter.user.name} invited you to join {organization.name}
        </Text>
        <Button href={inviteLink} className="bg-stone-900 text-white px-4 py-2 mb-6 rounded-md">
          Accept Invitation
        </Button>
        <Text className="text-stone-500 text-center m-0">
          This invitation will expire in {formatDistanceToNow(invitation.expiresAt)}.
        </Text>
      </Section>

      <Hr className="border-stone-200 my-6" />

      {/* Security Notice */}
      <Section>
        <Text className="text-xs text-stone-500 text-center">
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
