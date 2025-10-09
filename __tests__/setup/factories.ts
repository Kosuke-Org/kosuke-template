import { faker } from '@faker-js/faker';
import type { UserJSON, EmailAddressJSON } from '@clerk/types';

// Clerk UserJSON factory (complete type-safe webhook user)
export function createClerkWebhookUser(overrides: Partial<UserJSON> = {}): UserJSON {
  const firstName = faker.person.firstName();
  const lastName = faker.person.lastName();
  const email = faker.internet.email();
  const userId = `user_${faker.string.alphanumeric(10)}`;
  const emailId = `idn_${faker.string.alphanumeric(10)}`;
  const timestamp = Date.now();

  const emailAddress: EmailAddressJSON = {
    id: emailId,
    object: 'email_address',
    email_address: email,
    verification: null,
    linked_to: [],
    matches_sso_connection: false,
  };

  return {
    object: 'user',
    id: userId,
    external_id: null,
    primary_email_address_id: emailId,
    primary_phone_number_id: null,
    primary_web3_wallet_id: null,
    image_url: faker.image.avatar(),
    has_image: true,
    username: null,
    email_addresses: [emailAddress],
    phone_numbers: [],
    web3_wallets: [],
    external_accounts: [],
    enterprise_accounts: [],
    passkeys: [],
    saml_accounts: [],
    organization_memberships: [],
    password_enabled: true,
    profile_image_id: `img_${faker.string.alphanumeric(10)}`,
    first_name: firstName,
    last_name: lastName,
    totp_enabled: false,
    backup_code_enabled: false,
    two_factor_enabled: false,
    public_metadata: {},
    unsafe_metadata: {},
    last_sign_in_at: timestamp,
    create_organization_enabled: true,
    create_organizations_limit: null,
    delete_self_enabled: true,
    legal_accepted_at: null,
    updated_at: timestamp,
    created_at: timestamp,
    ...overrides,
  };
}
