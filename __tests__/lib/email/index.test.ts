import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock the resend module
const mockSegmentsList = vi.fn();
const mockSegmentsCreate = vi.fn();
const mockSegmentsGet = vi.fn();
const mockContactsList = vi.fn();
const mockContactsCreate = vi.fn();
const mockContactsSegmentsAdd = vi.fn();
const mockContactsSegmentsRemove = vi.fn();

vi.mock('resend', () => {
  return {
    Resend: vi.fn().mockImplementation(() => ({
      segments: {
        list: mockSegmentsList,
        create: mockSegmentsCreate,
        get: mockSegmentsGet,
      },
      contacts: {
        list: mockContactsList,
        create: mockContactsCreate,
        segments: {
          add: mockContactsSegmentsAdd,
          remove: mockContactsSegmentsRemove,
        },
      },
    })),
    Segment: vi.fn(),
  };
});

// Mock the queue functions
const mockAddToMarketingSegmentJob = vi.fn();
const mockRemoveFromMarketingSegmentJob = vi.fn();

vi.mock('@/lib/queue', () => ({
  addToMarketingSegmentJob: mockAddToMarketingSegmentJob,
  removeFromMarketingSegmentJob: mockRemoveFromMarketingSegmentJob,
}));

// Import after mocking
const {
  setAudienceForMarketingEmail,
  removeContactFromMarketingSegment,
  getOrCreateMarketingSegment,
} = await import('@/lib/email');

describe('getOrCreateMarketingSegment', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return existing segment when it exists', async () => {
    const mockSegmentId = 'seg_existing';

    mockSegmentsList.mockResolvedValue({
      data: {
        data: [
          {
            id: mockSegmentId,
            name: 'Marketing',
            created_at: '2024-01-01T00:00:00Z',
          },
        ],
      },
      error: null,
    });

    const result = await getOrCreateMarketingSegment();

    expect(result).not.toBeNull();
    expect(result?.id).toBe(mockSegmentId);
    expect(result?.name).toBe('Marketing');
    expect(mockSegmentsCreate).not.toHaveBeenCalled();
  });

  it('should create segment when none exist', async () => {
    const mockSegmentId = 'seg_new';

    mockSegmentsList.mockResolvedValue({
      data: { data: [] },
      error: null,
    });

    mockSegmentsCreate.mockResolvedValue({
      data: { id: mockSegmentId, name: 'Marketing' },
      error: null,
    });

    const result = await getOrCreateMarketingSegment();

    expect(result).not.toBeNull();
    expect(result?.id).toBe(mockSegmentId);
    expect(mockSegmentsCreate).toHaveBeenCalledWith({ name: 'Marketing' });
  });

  it('should return null when segment listing fails', async () => {
    mockSegmentsList.mockResolvedValue({
      data: null,
      error: { message: 'API error' },
    });

    const result = await getOrCreateMarketingSegment();

    expect(result).toBeNull();
  });

  it('should return null when segment creation fails', async () => {
    mockSegmentsList.mockResolvedValue({
      data: { data: [] },
      error: null,
    });

    mockSegmentsCreate.mockResolvedValue({
      data: null,
      error: { message: 'Creation failed' },
    });

    const result = await getOrCreateMarketingSegment();

    expect(result).toBeNull();
  });

  it('should return segment data when creation succeeds', async () => {
    mockSegmentsList.mockResolvedValue({
      data: { data: [] },
      error: null,
    });

    mockSegmentsCreate.mockResolvedValue({
      data: { id: 'seg_123', name: 'Marketing' },
      error: null,
    });

    const result = await getOrCreateMarketingSegment();

    expect(result).not.toBeNull();
    expect(result?.id).toBe('seg_123');
    expect(result?.name).toBe('Marketing');
  });
});

describe('setAudienceForMarketingEmail', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should queue job successfully', async () => {
    const testEmail = 'test@example.com';
    const mockJobId = 'job_123';

    mockAddToMarketingSegmentJob.mockResolvedValue({
      id: mockJobId,
    });

    const result = await setAudienceForMarketingEmail(testEmail);

    expect(result).toEqual({ jobId: mockJobId });
    expect(mockAddToMarketingSegmentJob).toHaveBeenCalledWith({ email: testEmail });
  });

  it('should return undefined when queueing fails', async () => {
    const testEmail = 'test@example.com';

    mockAddToMarketingSegmentJob.mockRejectedValue(new Error('Queue error'));

    const result = await setAudienceForMarketingEmail(testEmail);

    expect(result).toBeUndefined();
    expect(mockAddToMarketingSegmentJob).toHaveBeenCalledWith({ email: testEmail });
  });
});

describe('removeContactFromMarketingSegment', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should queue job successfully', async () => {
    const testEmail = 'test@example.com';
    const mockJobId = 'job_456';

    mockRemoveFromMarketingSegmentJob.mockResolvedValue({
      id: mockJobId,
    });

    const result = await removeContactFromMarketingSegment(testEmail);

    expect(result).toEqual({ jobId: mockJobId });
    expect(mockRemoveFromMarketingSegmentJob).toHaveBeenCalledWith({ email: testEmail });
  });

  it('should return undefined when queueing fails', async () => {
    const testEmail = 'test@example.com';

    mockRemoveFromMarketingSegmentJob.mockRejectedValue(new Error('Queue error'));

    const result = await removeContactFromMarketingSegment(testEmail);

    expect(result).toBeUndefined();
    expect(mockRemoveFromMarketingSegmentJob).toHaveBeenCalledWith({ email: testEmail });
  });
});
