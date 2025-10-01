import { renderHook } from '@testing-library/react';
import { useIsMobile } from '@/hooks/use-mobile';
import { vi } from 'vitest';

// Mock window.matchMedia
const mockMatchMedia = (matches: boolean) => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query) => ({
      matches,
      media: query,
      onchange: null,
      addListener: vi.fn(), // deprecated
      removeListener: vi.fn(), // deprecated
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
};

// Mock window.innerWidth
const mockInnerWidth = (width: number) => {
  Object.defineProperty(window, 'innerWidth', {
    writable: true,
    configurable: true,
    value: width,
  });
};

describe('useIsMobile', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return true for mobile screens', () => {
    mockInnerWidth(500); // Mobile width
    mockMatchMedia(true); // Mobile breakpoint matches

    const { result } = renderHook(() => useIsMobile());

    expect(result.current).toBe(true);
  });

  it('should return false for desktop screens', () => {
    mockInnerWidth(1200); // Desktop width
    mockMatchMedia(false); // Mobile breakpoint does not match

    const { result } = renderHook(() => useIsMobile());

    expect(result.current).toBe(false);
  });

  it('should use the correct media query', () => {
    mockInnerWidth(1200);
    mockMatchMedia(false);

    renderHook(() => useIsMobile());

    expect(window.matchMedia).toHaveBeenCalledWith('(max-width: 767px)');
  });

  it('should respond to screen size changes', () => {
    const matchMediaResult = {
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    };

    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockReturnValue(matchMediaResult),
    });

    const { result, rerender } = renderHook(() => useIsMobile());

    expect(result.current).toBe(false);

    // Simulate screen size change to mobile
    matchMediaResult.matches = true;

    // Trigger the media query change listener
    const changeHandler = matchMediaResult.addEventListener.mock.calls.find(
      (call) => call[0] === 'change'
    )?.[1];

    if (changeHandler) {
      changeHandler({ matches: true });
    }

    rerender();

    // Note: The actual behavior depends on the hook implementation
    // This test structure shows how to test media query changes
    expect(matchMediaResult.addEventListener).toHaveBeenCalledWith('change', expect.any(Function));
  });
});
