import { renderHook, act } from '@testing-library/react';
import { useFormSubmission } from '@/hooks/use-form-submission';
import { mockFetchResponse, mockFetchError, resetMocks } from '../setup/mocks';

describe('useFormSubmission', () => {
  beforeEach(() => {
    resetMocks();
  });

  it('should handle successful form submission', async () => {
    const { result } = renderHook(() => useFormSubmission());

    const mockResponse = { success: true, data: { id: '123' } };
    mockFetchResponse(mockResponse);

    let submitResult;
    await act(async () => {
      submitResult = await result.current.submitForm('/api/test', { name: 'John' });
    });

    expect(submitResult).toEqual(mockResponse);
    expect(result.current.isSubmitting).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('should handle form submission errors', async () => {
    const { result } = renderHook(() => useFormSubmission());

    mockFetchError('Network error');

    await act(async () => {
      try {
        await result.current.submitForm('/api/test', { name: 'John' });
      } catch (error) {
        // Expected to throw
      }
    });

    expect(result.current.isSubmitting).toBe(false);
    expect(result.current.error).toBeTruthy();
  });

  it('should track submission state', async () => {
    const { result } = renderHook(() => useFormSubmission());

    const mockResponse = { success: true };
    mockFetchResponse(mockResponse);

    expect(result.current.isSubmitting).toBe(false);

    act(() => {
      result.current.submitForm('/api/test', { name: 'John' });
    });

    expect(result.current.isSubmitting).toBe(true);

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(result.current.isSubmitting).toBe(false);
  });

  it('should clear errors on new submission', async () => {
    const { result } = renderHook(() => useFormSubmission());

    // First submission fails
    mockFetchError('First error');
    await act(async () => {
      try {
        await result.current.submitForm('/api/test', { name: 'John' });
      } catch (error) {
        // Expected
      }
    });

    expect(result.current.error).toBeTruthy();

    // Second submission succeeds
    const mockResponse = { success: true };
    mockFetchResponse(mockResponse);

    await act(async () => {
      await result.current.submitForm('/api/test', { name: 'Jane' });
    });

    expect(result.current.error).toBeNull();
  });

  it('should handle concurrent submissions correctly', async () => {
    const { result } = renderHook(() => useFormSubmission());

    const mockResponse = { success: true };
    mockFetchResponse(mockResponse);
    mockFetchResponse(mockResponse);

    const promise1 = act(async () => {
      return result.current.submitForm('/api/test1', { data: '1' });
    });

    const promise2 = act(async () => {
      return result.current.submitForm('/api/test2', { data: '2' });
    });

    await Promise.all([promise1, promise2]);

    expect(result.current.isSubmitting).toBe(false);
  });

  it('should validate form data before submission', async () => {
    const { result } = renderHook(() => useFormSubmission());

    await act(async () => {
      try {
        await result.current.submitForm('/api/test', null);
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    expect(result.current.error).toBeTruthy();
  });
});
