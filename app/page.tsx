import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { getUserOrganizations } from '@/lib/organizations';

export default async function Home() {
  const { userId } = await auth();

  if (userId) {
    // Fetch user's organizations to redirect to org dashboard
    const organizations = await getUserOrganizations(userId);

    if (organizations.length > 0) {
      // Redirect to first organization's dashboard
      const firstOrg = organizations[0];
      redirect(`/org/${firstOrg.slug}/dashboard`);
    } else {
      // No organizations - redirect to onboarding
      redirect('/onboarding');
    }
  } else {
    // Redirect to the home page in the logged-out route group
    redirect('/home');
  }
}
