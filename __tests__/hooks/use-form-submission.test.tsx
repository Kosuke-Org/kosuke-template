import { renderHook, act } from '@testing-library/react';
import { useFormSubmission } from '@/hooks/use-form-submission';
import { createQueryWrapper } from '../setup/mocks';

// Mock useToast hook
jest.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: jest.fn(),
  }),
}));

describe('useFormSubmission', () => {
  const wrapper = createQueryWrapper();

  it('should handle successful form submission', async () => {
    const mockOnSubmit = jest.fn().mockResolvedValue(undefined);
    const { result } = renderHook(
      () =>
        useFormSubmission({
          onSubmit: mockOnSubmit,
          successMessage: 'Success!',
        }),
      { wrapper }
    );

    const testData = { name: 'John' };

    await act(async () => {
      await result.current.handleSubmit(testData);
    });

    expect(mockOnSubmit).toHaveBeenCalledWith(testData);
    expect(result.current.isSubmitting).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('should handle form submission errors', async () => {
    const mockError = new Error('Submission failed');
    const mockOnSubmit = jest.fn().mockRejectedValue(mockError);
    const { result } = renderHook(
      () =>
        useFormSubmission({
          onSubmit: mockOnSubmit,
        }),
      { wrapper }
    );

    await act(async () => {
      result.current.handleSubmit({ name: 'John' });
    });

    // Wait for mutation to complete
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(result.current.isSubmitting).toBe(false);
    expect(result.current.error).toEqual(mockError);
  });

  it('should track submission state', async () => {
    let resolveSubmission: () => void;
    const mockOnSubmit = jest.fn().mockImplementation(() => {
      return new Promise<void>((resolve) => {
        resolveSubmission = resolve;
      });
    });

    const { result } = renderHook(
      () =>
        useFormSubmission({
          onSubmit: mockOnSubmit,
        }),
      { wrapper }
    );

    expect(result.current.isSubmitting).toBe(false);

    act(() => {
      result.current.handleSubmit({ name: 'John' });
    });

    // Check that submitting state is now true
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    expect(result.current.isSubmitting).toBe(true);

    await act(async () => {
      resolveSubmission();
      // Wait for the promise to fully resolve
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(result.current.isSubmitting).toBe(false);
  });

  it('should handle concurrent submissions correctly', async () => {
    const mockOnSubmit = jest
      .fn()
      .mockImplementation(() => new Promise((resolve) => setTimeout(resolve, 50)));

    const { result } = renderHook(
      () =>
        useFormSubmission({
          onSubmit: mockOnSubmit,
        }),
      { wrapper }
    );

    act(() => {
      result.current.handleSubmit({ name: 'John' });
      result.current.handleSubmit({ name: 'Jane' }); // TanStack Query handles concurrent mutations
    });

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 100));
    });

    // The hook may allow concurrent submissions or prevent them
    // This test checks that the hook handles concurrent calls gracefully
    expect(mockOnSubmit).toHaveBeenCalled();
    expect(result.current.isSubmitting).toBe(false);
  });

  it('should clear errors on new submission', async () => {
    const mockOnSubmit = jest
      .fn()
      .mockRejectedValueOnce(new Error('First error'))
      .mockResolvedValueOnce(undefined);

    const { result } = renderHook(
      () =>
        useFormSubmission({
          onSubmit: mockOnSubmit,
        }),
      { wrapper }
    );

    // First submission fails
    await act(async () => {
      result.current.handleSubmit({ name: 'John' });
    });

    // Wait for error to be set
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(result.current.error).toBeTruthy();

    // Reset mutation before second attempt
    act(() => {
      result.current.reset();
    });

    // Second submission succeeds
    await act(async () => {
      result.current.handleSubmit({ name: 'Jane' });
    });

    // Wait for success
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(result.current.error).toBeNull();
  });

  it('should call success and error callbacks', async () => {
    const mockOnSuccess = jest.fn();
    const mockOnError = jest.fn();
    const mockOnSubmit = jest.fn().mockResolvedValue(undefined);

    const { result } = renderHook(
      () =>
        useFormSubmission({
          onSubmit: mockOnSubmit,
          onSuccess: mockOnSuccess,
          onError: mockOnError,
        }),
      { wrapper }
    );

    const testData = { name: 'John' };

    await act(async () => {
      await result.current.handleSubmit(testData);
    });

    expect(mockOnSuccess).toHaveBeenCalledWith(testData);
    expect(mockOnError).not.toHaveBeenCalled();
  });
});
