import { renderHook, act } from '@testing-library/react';
import { useAsyncOperation } from '@/hooks/use-async-operation';
import { vi } from 'vitest';

// Mock useToast hook
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

describe('useAsyncOperation', () => {
  it('should handle successful async operations', async () => {
    const mockOperation = vi.fn().mockResolvedValue('success');
    const { result } = renderHook(() => useAsyncOperation(mockOperation));

    expect(result.current.isLoading).toBe(false);
    expect(result.current.data).toBeNull();
    expect(result.current.error).toBeNull();

    await act(async () => {
      await result.current.execute();
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.data).toBe('success');
    expect(result.current.error).toBeNull();
    expect(mockOperation).toHaveBeenCalledTimes(1);
  });

  it('should handle async operation errors', async () => {
    const mockError = new Error('Operation failed');
    const mockOperation = vi.fn().mockRejectedValue(mockError);
    const { result } = renderHook(() => useAsyncOperation(mockOperation));

    await act(async () => {
      await result.current.execute();
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.data).toBeNull();
    expect(result.current.error).toBe(mockError);
    expect(mockOperation).toHaveBeenCalledTimes(1);
  });

  it('should track loading state during execution', async () => {
    let resolveOperation: (value: string) => void;
    const mockOperation = vi.fn().mockImplementation(() => {
      return new Promise<string>((resolve) => {
        resolveOperation = resolve;
      });
    });

    const { result } = renderHook(() => useAsyncOperation(mockOperation));

    expect(result.current.isLoading).toBe(false);

    act(() => {
      result.current.execute();
    });

    expect(result.current.isLoading).toBe(true);

    await act(async () => {
      resolveOperation('completed');
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.data).toBe('completed');
  });

  it('should handle multiple executions correctly', async () => {
    const mockOperation = vi
      .fn()
      .mockResolvedValueOnce('first')
      .mockRejectedValueOnce(new Error('second failed'));

    const { result } = renderHook(() => useAsyncOperation(mockOperation));

    // First execution succeeds
    await act(async () => {
      await result.current.execute();
    });

    expect(result.current.data).toBe('first');
    expect(result.current.error).toBeNull();

    // Second execution fails - the hook behavior depends on implementation
    // Some hooks might clear data, others might keep it
    await act(async () => {
      await result.current.execute();
    });

    expect(result.current.error).toEqual(new Error('second failed'));
    // Note: Data behavior on error depends on hook implementation
  });

  it('should pass arguments to the async operation', async () => {
    const mockOperation = vi.fn().mockResolvedValue('success');
    const { result } = renderHook(() => useAsyncOperation(mockOperation));

    await act(async () => {
      await result.current.execute('arg1', 'arg2', 42);
    });

    expect(mockOperation).toHaveBeenCalledWith('arg1', 'arg2', 42);
  });

  it('should prevent concurrent executions', async () => {
    let resolveFirst: (value: string) => void;

    const mockOperation = vi.fn().mockImplementationOnce(
      () =>
        new Promise<string>((resolve) => {
          resolveFirst = resolve;
        })
    );

    const { result } = renderHook(() => useAsyncOperation(mockOperation));

    // Start first execution
    act(() => {
      result.current.execute();
    });

    expect(result.current.isLoading).toBe(true);

    // Try to start second execution while first is pending
    act(() => {
      result.current.execute();
    });

    // Should still be loading from first execution
    expect(result.current.isLoading).toBe(true);

    // Complete first execution
    await act(async () => {
      resolveFirst('first');
    });

    expect(result.current.data).toBe('first');
    expect(result.current.isLoading).toBe(false);

    // The second execution should have been ignored since first was in progress
    expect(mockOperation).toHaveBeenCalledTimes(1);
  });

  it('should provide reset functionality', async () => {
    const mockOperation = vi.fn().mockResolvedValue('success');
    const { result } = renderHook(() => useAsyncOperation(mockOperation));

    await act(async () => {
      await result.current.execute();
    });

    expect(result.current.data).toBe('success');

    act(() => {
      result.current.reset();
    });

    expect(result.current.data).toBeNull();
    expect(result.current.error).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });

  it('should call success and error callbacks', async () => {
    const mockOnSuccess = vi.fn();
    const mockOnError = vi.fn();
    const mockOperation = vi.fn().mockResolvedValue('success');

    const { result } = renderHook(() =>
      useAsyncOperation(mockOperation, {
        onSuccess: mockOnSuccess,
        onError: mockOnError,
        successMessage: 'Operation completed',
      })
    );

    await act(async () => {
      await result.current.execute();
    });

    expect(mockOnSuccess).toHaveBeenCalled();
    expect(mockOnError).not.toHaveBeenCalled();
  });
});
