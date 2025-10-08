/**
 * Tests for use-tasks hook
 */

import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode } from 'react';
import { useTasks } from '@/hooks/use-tasks';
import { trpc } from '@/lib/trpc/client';
import { vi, type Mock } from 'vitest';

// Mock toast
const mockToast = vi.fn();
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: mockToast,
    dismiss: vi.fn(),
  }),
}));

// Mock the trpc client
vi.mock('@/lib/trpc/client', () => ({
  trpc: {
    tasks: {
      list: {
        useQuery: vi.fn(),
      },
      create: {
        useMutation: vi.fn(),
      },
      update: {
        useMutation: vi.fn(),
      },
      delete: {
        useMutation: vi.fn(),
      },
    },
    useUtils: () => ({
      tasks: {
        list: vi.fn(),
        setData: vi.fn(),
        getData: vi.fn(),
      },
    }),
  },
}));

describe('useTasks', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    vi.clearAllMocks();
  });

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  const mockTasks = [
    {
      id: 1,
      title: 'Test Task 1',
      description: 'Description 1',
      completed: false,
      priority: 'high' as const,
      dueDate: new Date('2025-12-31'),
      createdAt: new Date(),
      updatedAt: new Date(),
      isOverdue: false,
    },
    {
      id: 2,
      title: 'Test Task 2',
      description: 'Description 2',
      completed: true,
      priority: 'medium' as const,
      dueDate: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      isOverdue: false,
    },
  ];

  it('should fetch tasks successfully', async () => {
    const mockRefetch = vi.fn();

    (trpc.tasks.list.useQuery as Mock).mockReturnValue({
      data: mockTasks,
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    });

    (trpc.tasks.create.useMutation as Mock).mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    });

    (trpc.tasks.update.useMutation as Mock).mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    });

    (trpc.tasks.delete.useMutation as Mock).mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    });

    const { result } = renderHook(() => useTasks(), { wrapper });

    await waitFor(() => {
      expect(result.current.tasks).toEqual(mockTasks);
      expect(result.current.isLoading).toBe(false);
    });
  });

  it('should handle loading state', () => {
    (trpc.tasks.list.useQuery as Mock).mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
      refetch: vi.fn(),
    });

    (trpc.tasks.create.useMutation as Mock).mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    });

    (trpc.tasks.update.useMutation as Mock).mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    });

    (trpc.tasks.delete.useMutation as Mock).mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    });

    const { result } = renderHook(() => useTasks(), { wrapper });

    expect(result.current.isLoading).toBe(true);
    expect(result.current.tasks).toEqual([]);
  });

  it('should create task successfully', async () => {
    const mockMutateAsync = vi.fn().mockResolvedValue({
      id: 3,
      title: 'New Task',
      description: 'New Description',
      completed: false,
      priority: 'medium',
      dueDate: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const mockRefetch = vi.fn();

    (trpc.tasks.list.useQuery as Mock).mockReturnValue({
      data: mockTasks,
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    });

    (trpc.tasks.create.useMutation as Mock).mockReturnValue({
      mutateAsync: mockMutateAsync,
      isPending: false,
      onSuccess: vi.fn((callback: () => void) => callback()),
      onError: vi.fn(),
    });

    (trpc.tasks.update.useMutation as Mock).mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    });

    (trpc.tasks.delete.useMutation as Mock).mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    });

    const { result } = renderHook(() => useTasks(), { wrapper });

    await result.current.createTask({
      title: 'New Task',
      description: 'New Description',
      priority: 'medium',
    });

    expect(mockMutateAsync).toHaveBeenCalledWith({
      title: 'New Task',
      description: 'New Description',
      priority: 'medium',
    });
  });

  it('should update task successfully', async () => {
    const mockMutateAsync = vi.fn().mockResolvedValue({
      id: 1,
      title: 'Updated Task',
      description: 'Updated Description',
      completed: false,
      priority: 'low',
      dueDate: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const mockRefetch = vi.fn();

    (trpc.tasks.list.useQuery as Mock).mockReturnValue({
      data: mockTasks,
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    });

    (trpc.tasks.create.useMutation as Mock).mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    });

    (trpc.tasks.update.useMutation as Mock).mockReturnValue({
      mutateAsync: mockMutateAsync,
      isPending: false,
    });

    (trpc.tasks.delete.useMutation as Mock).mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    });

    const { result } = renderHook(() => useTasks(), { wrapper });

    await result.current.updateTask({
      id: '1',
      title: 'Updated Task',
      priority: 'low',
    });

    expect(mockMutateAsync).toHaveBeenCalledWith({
      id: '1',
      title: 'Updated Task',
      priority: 'low',
    });
  });

  it('should delete task successfully', async () => {
    const mockMutateAsync = vi.fn().mockResolvedValue({ success: true });
    const mockRefetch = vi.fn();

    (trpc.tasks.list.useQuery as Mock).mockReturnValue({
      data: mockTasks,
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    });

    (trpc.tasks.create.useMutation as Mock).mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    });

    (trpc.tasks.update.useMutation as Mock).mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    });

    (trpc.tasks.delete.useMutation as Mock).mockReturnValue({
      mutateAsync: mockMutateAsync,
      isPending: false,
    });

    const { result } = renderHook(() => useTasks(), { wrapper });

    await result.current.deleteTask('1');

    expect(mockMutateAsync).toHaveBeenCalledWith({ id: '1' });
  });

  it('should filter tasks by completion status', () => {
    const mockRefetch = vi.fn();

    (trpc.tasks.list.useQuery as Mock).mockImplementation((filters) => ({
      data: filters?.completed ? [mockTasks[1]] : mockTasks,
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    }));

    (trpc.tasks.create.useMutation as Mock).mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    });

    (trpc.tasks.update.useMutation as Mock).mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    });

    (trpc.tasks.delete.useMutation as Mock).mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    });

    renderHook(() => useTasks({ completed: true }), { wrapper });

    expect(trpc.tasks.list.useQuery).toHaveBeenCalledWith({ completed: true }, expect.any(Object));
  });

  it('should filter tasks by priority', () => {
    const mockRefetch = vi.fn();

    (trpc.tasks.list.useQuery as Mock).mockImplementation((filters) => ({
      data: filters?.priority === 'high' ? [mockTasks[0]] : mockTasks,
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    }));

    (trpc.tasks.create.useMutation as Mock).mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    });

    (trpc.tasks.update.useMutation as Mock).mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    });

    (trpc.tasks.delete.useMutation as Mock).mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    });

    renderHook(() => useTasks({ priority: 'high' }), { wrapper });

    expect(trpc.tasks.list.useQuery).toHaveBeenCalledWith({ priority: 'high' }, expect.any(Object));
  });

  it('should filter tasks by search query (server-side)', () => {
    const mockRefetch = vi.fn();
    const searchQuery = 'Test Task 1';

    (trpc.tasks.list.useQuery as Mock).mockImplementation((filters) => ({
      data: filters?.searchQuery ? [mockTasks[0]] : mockTasks,
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    }));

    (trpc.tasks.create.useMutation as Mock).mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    });

    (trpc.tasks.update.useMutation as Mock).mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    });

    (trpc.tasks.delete.useMutation as Mock).mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    });

    const { result } = renderHook(() => useTasks({ searchQuery }), { wrapper });

    expect(trpc.tasks.list.useQuery).toHaveBeenCalledWith({ searchQuery }, expect.any(Object));
    expect(result.current.tasks).toHaveLength(1);
  });

  it('should handle combined filters (completed + priority + search)', () => {
    const mockRefetch = vi.fn();

    (trpc.tasks.list.useQuery as Mock).mockImplementation((filters) => ({
      data:
        filters?.completed && filters?.priority === 'high' && filters?.searchQuery
          ? [mockTasks[0]]
          : mockTasks,
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    }));

    (trpc.tasks.create.useMutation as Mock).mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    });

    (trpc.tasks.update.useMutation as Mock).mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    });

    (trpc.tasks.delete.useMutation as Mock).mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    });

    renderHook(
      () =>
        useTasks({
          completed: true,
          priority: 'high',
          searchQuery: 'task',
        }),
      { wrapper }
    );

    expect(trpc.tasks.list.useQuery).toHaveBeenCalledWith(
      {
        completed: true,
        priority: 'high',
        searchQuery: 'task',
      },
      expect.any(Object)
    );
  });
});
