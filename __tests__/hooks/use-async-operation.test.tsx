import { renderHook, act } from '@testing-library/react';
import { useAsyncOperation } from '@/hooks/use-async-operation';

describe('useAsyncOperation', () => {
  it('should handle successful async operations', async () => {
    const mockOperation = jest.fn().mockResolvedValue('success');
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
    const mockOperation = jest.fn().mockRejectedValue(mockError);
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
    const mockOperation = jest.fn().mockImplementation(() => {
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

  it('should reset state on new execution', async () => {
    const mockOperation = jest
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

    // Second execution fails
    await act(async () => {
      await result.current.execute();
    });

    expect(result.current.data).toBeNull();
    expect(result.current.error).toEqual(new Error('second failed'));
  });

  it('should pass arguments to the async operation', async () => {
    const mockOperation = jest.fn().mockResolvedValue('success');
    const { result } = renderHook(() => useAsyncOperation(mockOperation));

    await act(async () => {
      await result.current.execute('arg1', 'arg2', 42);
    });

    expect(mockOperation).toHaveBeenCalledWith('arg1', 'arg2', 42);
  });

  it('should handle multiple concurrent executions', async () => {
    const resolvers: Array<(value: string) => void> = [];

    const mockOperation = jest.fn().mockImplementation(() => {
      return new Promise<string>((resolve) => {
        resolvers.push(resolve);
      });
    });

    const { result } = renderHook(() => useAsyncOperation(mockOperation));

    // Start multiple executions
    const promise1 = act(async () => {
      return result.current.execute();
    });

    const promise2 = act(async () => {
      return result.current.execute();
    });

    expect(result.current.isLoading).toBe(true);

    // Resolve the first operation
    act(() => {
      resolvers[0]('first');
    });

    await promise1;

    // The hook should still be loading because the second operation is pending
    expect(result.current.isLoading).toBe(true);

    // Resolve the second operation
    act(() => {
      resolvers[1]('second');
    });

    await promise2;

    expect(result.current.isLoading).toBe(false);
    expect(result.current.data).toBe('second'); // Last resolved value
  });

  it('should provide reset functionality', async () => {
    const mockOperation = jest.fn().mockResolvedValue('success');
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
});
