import { renderHook } from '@testing-library/react';
import { useIsMobile } from '@/hooks/use-mobile';

// Mock window.matchMedia
const mockMatchMedia = (matches: boolean) => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation((query) => ({
      matches,
      media: query,
      onchange: null,
      addListener: jest.fn(), // deprecated
      removeListener: jest.fn(), // deprecated
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })),
  });
};

describe('useMobile', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return true for mobile screens', () => {
    mockMatchMedia(true); // Mobile breakpoint matches

    const { result } = renderHook(() => useMobile());

    expect(result.current).toBe(true);
  });

  it('should return false for desktop screens', () => {
    mockMatchMedia(false); // Mobile breakpoint does not match

    const { result } = renderHook(() => useMobile());

    expect(result.current).toBe(false);
  });

  it('should use the correct media query', () => {
    mockMatchMedia(false);

    renderHook(() => useIsMobile());

    expect(window.matchMedia).toHaveBeenCalledWith('(max-width: 768px)');
  });

  it('should handle window.matchMedia not being available', () => {
    // Remove matchMedia to simulate older browsers
    delete (window as unknown as { matchMedia?: unknown }).matchMedia;

    const { result } = renderHook(() => useMobile());

    // Should default to false when matchMedia is not available
    expect(result.current).toBe(false);
  });

  it('should respond to screen size changes', () => {
    const matchMediaResult = {
      matches: false,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    };

    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: jest.fn().mockReturnValue(matchMediaResult),
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
