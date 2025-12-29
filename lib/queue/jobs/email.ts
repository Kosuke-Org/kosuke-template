import { addContactToMarketingSegment, removeContactFromMarketingSegmentDirect } from '@/lib/email';

import type {
  AddToMarketingSegmentJobData,
  RemoveFromMarketingSegmentJobData,
} from '../queues/email';

/**
 * Process add to marketing segment job
 * Delegates to the email service
 */
export async function processAddToMarketingSegment(data: AddToMarketingSegmentJobData) {
  await addContactToMarketingSegment(data.email);
}

/**
 * Process remove from marketing segment job
 * Delegates to the email service
 */
export async function processRemoveFromMarketingSegment(data: RemoveFromMarketingSegmentJobData) {
  await removeContactFromMarketingSegmentDirect(data.email);
}
