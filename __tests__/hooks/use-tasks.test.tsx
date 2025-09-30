/**
 * Tests for use-tasks hook
 */

import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode } from 'react';
import { useTasks } from '@/hooks/use-tasks';
import { trpc } from '@/lib/trpc/client';

// Mock toast
const mockToast = jest.fn();
jest.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: mockToast,
    dismiss: jest.fn(),
  }),
}));

// Mock the trpc client
jest.mock('@/lib/trpc/client', () => ({
  trpc: {
    tasks: {
      list: {
        useQuery: jest.fn(),
      },
      stats: {
        useQuery: jest.fn(),
      },
      create: {
        useMutation: jest.fn(),
      },
      update: {
        useMutation: jest.fn(),
      },
      delete: {
        useMutation: jest.fn(),
      },
      toggleComplete: {
        useMutation: jest.fn(),
      },
    },
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
    jest.clearAllMocks();
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

  const mockStats = {
    total: 2,
    completed: 1,
    pending: 1,
    overdue: 0,
    byPriority: {
      low: 0,
      medium: 1,
      high: 1,
    },
  };

  it('should fetch tasks successfully', async () => {
    const mockRefetch = jest.fn();

    (trpc.tasks.list.useQuery as jest.Mock).mockReturnValue({
      data: mockTasks,
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    });

    (trpc.tasks.stats.useQuery as jest.Mock).mockReturnValue({
      data: mockStats,
    });

    (trpc.tasks.create.useMutation as jest.Mock).mockReturnValue({
      mutateAsync: jest.fn(),
      isPending: false,
    });

    (trpc.tasks.update.useMutation as jest.Mock).mockReturnValue({
      mutateAsync: jest.fn(),
      isPending: false,
    });

    (trpc.tasks.delete.useMutation as jest.Mock).mockReturnValue({
      mutateAsync: jest.fn(),
      isPending: false,
    });

    (trpc.tasks.toggleComplete.useMutation as jest.Mock).mockReturnValue({
      mutateAsync: jest.fn(),
      isPending: false,
    });

    const { result } = renderHook(() => useTasks(), { wrapper });

    await waitFor(() => {
      expect(result.current.tasks).toEqual(mockTasks);
      expect(result.current.stats).toEqual(mockStats);
      expect(result.current.isLoading).toBe(false);
    });
  });

  it('should handle loading state', () => {
    (trpc.tasks.list.useQuery as jest.Mock).mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
      refetch: jest.fn(),
    });

    (trpc.tasks.stats.useQuery as jest.Mock).mockReturnValue({
      data: undefined,
    });

    (trpc.tasks.create.useMutation as jest.Mock).mockReturnValue({
      mutateAsync: jest.fn(),
      isPending: false,
    });

    (trpc.tasks.update.useMutation as jest.Mock).mockReturnValue({
      mutateAsync: jest.fn(),
      isPending: false,
    });

    (trpc.tasks.delete.useMutation as jest.Mock).mockReturnValue({
      mutateAsync: jest.fn(),
      isPending: false,
    });

    (trpc.tasks.toggleComplete.useMutation as jest.Mock).mockReturnValue({
      mutateAsync: jest.fn(),
      isPending: false,
    });

    const { result } = renderHook(() => useTasks(), { wrapper });

    expect(result.current.isLoading).toBe(true);
    expect(result.current.tasks).toEqual([]);
  });

  it('should create task successfully', async () => {
    const mockMutateAsync = jest.fn().mockResolvedValue({
      id: 3,
      title: 'New Task',
      description: 'New Description',
      completed: false,
      priority: 'medium',
      dueDate: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const mockRefetch = jest.fn();

    (trpc.tasks.list.useQuery as jest.Mock).mockReturnValue({
      data: mockTasks,
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    });

    (trpc.tasks.stats.useQuery as jest.Mock).mockReturnValue({
      data: mockStats,
    });

    (trpc.tasks.create.useMutation as jest.Mock).mockReturnValue({
      mutateAsync: mockMutateAsync,
      isPending: false,
      onSuccess: jest.fn((callback: () => void) => callback()),
      onError: jest.fn(),
    });

    (trpc.tasks.update.useMutation as jest.Mock).mockReturnValue({
      mutateAsync: jest.fn(),
      isPending: false,
    });

    (trpc.tasks.delete.useMutation as jest.Mock).mockReturnValue({
      mutateAsync: jest.fn(),
      isPending: false,
    });

    (trpc.tasks.toggleComplete.useMutation as jest.Mock).mockReturnValue({
      mutateAsync: jest.fn(),
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
    const mockMutateAsync = jest.fn().mockResolvedValue({
      id: 1,
      title: 'Updated Task',
      description: 'Updated Description',
      completed: false,
      priority: 'low',
      dueDate: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const mockRefetch = jest.fn();

    (trpc.tasks.list.useQuery as jest.Mock).mockReturnValue({
      data: mockTasks,
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    });

    (trpc.tasks.stats.useQuery as jest.Mock).mockReturnValue({
      data: mockStats,
    });

    (trpc.tasks.create.useMutation as jest.Mock).mockReturnValue({
      mutateAsync: jest.fn(),
      isPending: false,
    });

    (trpc.tasks.update.useMutation as jest.Mock).mockReturnValue({
      mutateAsync: mockMutateAsync,
      isPending: false,
    });

    (trpc.tasks.delete.useMutation as jest.Mock).mockReturnValue({
      mutateAsync: jest.fn(),
      isPending: false,
    });

    (trpc.tasks.toggleComplete.useMutation as jest.Mock).mockReturnValue({
      mutateAsync: jest.fn(),
      isPending: false,
    });

    const { result } = renderHook(() => useTasks(), { wrapper });

    await result.current.updateTask({
      id: 1,
      title: 'Updated Task',
      priority: 'low',
    });

    expect(mockMutateAsync).toHaveBeenCalledWith({
      id: 1,
      title: 'Updated Task',
      priority: 'low',
    });
  });

  it('should delete task successfully', async () => {
    const mockMutateAsync = jest.fn().mockResolvedValue({ success: true });
    const mockRefetch = jest.fn();

    (trpc.tasks.list.useQuery as jest.Mock).mockReturnValue({
      data: mockTasks,
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    });

    (trpc.tasks.stats.useQuery as jest.Mock).mockReturnValue({
      data: mockStats,
    });

    (trpc.tasks.create.useMutation as jest.Mock).mockReturnValue({
      mutateAsync: jest.fn(),
      isPending: false,
    });

    (trpc.tasks.update.useMutation as jest.Mock).mockReturnValue({
      mutateAsync: jest.fn(),
      isPending: false,
    });

    (trpc.tasks.delete.useMutation as jest.Mock).mockReturnValue({
      mutateAsync: mockMutateAsync,
      isPending: false,
    });

    (trpc.tasks.toggleComplete.useMutation as jest.Mock).mockReturnValue({
      mutateAsync: jest.fn(),
      isPending: false,
    });

    const { result } = renderHook(() => useTasks(), { wrapper });

    await result.current.deleteTask(1);

    expect(mockMutateAsync).toHaveBeenCalledWith({ id: 1 });
  });

  it('should toggle task completion', async () => {
    const mockMutateAsync = jest.fn().mockResolvedValue({
      id: 1,
      completed: true,
    });

    const mockRefetch = jest.fn();

    (trpc.tasks.list.useQuery as jest.Mock).mockReturnValue({
      data: mockTasks,
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    });

    (trpc.tasks.stats.useQuery as jest.Mock).mockReturnValue({
      data: mockStats,
    });

    (trpc.tasks.create.useMutation as jest.Mock).mockReturnValue({
      mutateAsync: jest.fn(),
      isPending: false,
    });

    (trpc.tasks.update.useMutation as jest.Mock).mockReturnValue({
      mutateAsync: jest.fn(),
      isPending: false,
    });

    (trpc.tasks.delete.useMutation as jest.Mock).mockReturnValue({
      mutateAsync: jest.fn(),
      isPending: false,
    });

    (trpc.tasks.toggleComplete.useMutation as jest.Mock).mockReturnValue({
      mutateAsync: mockMutateAsync,
      isPending: false,
    });

    const { result } = renderHook(() => useTasks(), { wrapper });

    await result.current.toggleComplete(1);

    expect(mockMutateAsync).toHaveBeenCalledWith({ id: 1 });
  });

  it('should filter tasks by completion status', () => {
    const mockRefetch = jest.fn();

    (trpc.tasks.list.useQuery as jest.Mock).mockImplementation((filters) => ({
      data: filters?.completed ? [mockTasks[1]] : mockTasks,
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    }));

    (trpc.tasks.stats.useQuery as jest.Mock).mockReturnValue({
      data: mockStats,
    });

    (trpc.tasks.create.useMutation as jest.Mock).mockReturnValue({
      mutateAsync: jest.fn(),
      isPending: false,
    });

    (trpc.tasks.update.useMutation as jest.Mock).mockReturnValue({
      mutateAsync: jest.fn(),
      isPending: false,
    });

    (trpc.tasks.delete.useMutation as jest.Mock).mockReturnValue({
      mutateAsync: jest.fn(),
      isPending: false,
    });

    (trpc.tasks.toggleComplete.useMutation as jest.Mock).mockReturnValue({
      mutateAsync: jest.fn(),
      isPending: false,
    });

    const { result } = renderHook(() => useTasks({ completed: true }), { wrapper });

    expect(trpc.tasks.list.useQuery).toHaveBeenCalledWith({ completed: true }, expect.any(Object));
  });

  it('should filter tasks by priority', () => {
    const mockRefetch = jest.fn();

    (trpc.tasks.list.useQuery as jest.Mock).mockImplementation((filters) => ({
      data: filters?.priority === 'high' ? [mockTasks[0]] : mockTasks,
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    }));

    (trpc.tasks.stats.useQuery as jest.Mock).mockReturnValue({
      data: mockStats,
    });

    (trpc.tasks.create.useMutation as jest.Mock).mockReturnValue({
      mutateAsync: jest.fn(),
      isPending: false,
    });

    (trpc.tasks.update.useMutation as jest.Mock).mockReturnValue({
      mutateAsync: jest.fn(),
      isPending: false,
    });

    (trpc.tasks.delete.useMutation as jest.Mock).mockReturnValue({
      mutateAsync: jest.fn(),
      isPending: false,
    });

    (trpc.tasks.toggleComplete.useMutation as jest.Mock).mockReturnValue({
      mutateAsync: jest.fn(),
      isPending: false,
    });

    const { result } = renderHook(() => useTasks({ priority: 'high' }), { wrapper });

    expect(trpc.tasks.list.useQuery).toHaveBeenCalledWith({ priority: 'high' }, expect.any(Object));
  });
});
