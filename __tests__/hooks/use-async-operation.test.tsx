import { renderHook, act } from '@testing-library/react';
import { useAsyncOperation } from '@/hooks/use-async-operation';

describe('useAsyncOperation - Business Logic', () => {
  it('should handle successful async operations', async () => {
    const mockOperation = jest.fn().mockResolvedValue('success');
    const { result } = renderHook(() => useAsyncOperation(mockOperation));

    expect(result.current.isLoading).toBe(false);
    expect(result.current.data).toBeNull();
    expect(result.current.error).toBeNull();

    let operationResult: string | null = null;
    await act(async () => {
      operationResult = (await result.current.execute()) as string | null;
    });

    expect(operationResult).toBe('success');
    expect(result.current.isLoading).toBe(false);
    expect(result.current.data).toBe('success');
    expect(result.current.error).toBeNull();
    expect(mockOperation).toHaveBeenCalledTimes(1);
  });

  it('should handle operation errors', async () => {
    const mockError = new Error('Operation failed');
    const mockOperation = jest.fn().mockRejectedValue(mockError);
    const { result } = renderHook(() => useAsyncOperation(mockOperation));

    await act(async () => {
      const operationResult = await result.current.execute();
      expect(operationResult).toBeNull();
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.data).toBeNull();
    expect(result.current.error).toBe(mockError);
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

  it('should reset state properly', async () => {
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

  it('should prevent concurrent executions', async () => {
    const mockOperation = jest.fn().mockResolvedValue('success');
    const { result } = renderHook(() => useAsyncOperation(mockOperation));

    // Start first execution
    act(() => {
      result.current.execute();
    });

    // Try to start second execution while first is running
    let secondResult: string | null = null;
    await act(async () => {
      secondResult = (await result.current.execute()) as string | null;
    });

    expect(secondResult).toBeNull(); // Should return null for concurrent execution
  });
});
