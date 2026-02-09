/**
 * tRPC router for waitlist operations
 * Public endpoints for joining the waitlist
 */
import { sendWaitlistConfirmationEmail } from '@/lib/email/waitlist';
import * as waitlistService from '@/lib/services/waitlist-service';
import { handleApiError } from '@/lib/utils';

import { publicProcedure, router } from '../init';
import { joinWaitlistSchema } from '../schemas/waitlist';

export const waitlistRouter = router({
  /**
   * Join waitlist - public endpoint
   */
  join: publicProcedure.input(joinWaitlistSchema).mutation(async ({ input }) => {
    try {
      const { email, ipAddress, userAgent, referrer } = input;

      // Add to waitlist
      const { waitlistEntry, isNewSubscriber } = await waitlistService.addToWaitlist({
        email,
        ipAddress,
        userAgent,
        referrer,
      });

      // Send confirmation email only for new subscribers
      if (isNewSubscriber) {
        try {
          await sendWaitlistConfirmationEmail(email);
        } catch (emailError) {
          // Log error but don't fail the request
          console.error('Failed to send waitlist confirmation email:', emailError);
        }
      }

      return {
        success: true,
        message: isNewSubscriber
          ? 'Successfully joined the waitlist!'
          : 'You are already on the waitlist!',
        isNewSubscriber,
      };
    } catch (error) {
      handleApiError(error);
    }
  }),
});
