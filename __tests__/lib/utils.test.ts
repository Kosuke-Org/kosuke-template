import { cn } from '@/lib/utils';

describe('Utils', () => {
  describe('cn (classnames utility)', () => {
    it('should merge class names correctly', () => {
      const result = cn('text-sm', 'text-red-500');
      expect(result).toContain('text-red-500');
      expect(result).toContain('text-sm');
      expect(typeof result).toBe('string');
    });

    it('should handle conditional classes', () => {
      const isActive = true;
      const result = cn('base-class', { 'active-class': isActive });
      expect(result).toContain('base-class');
      expect(result).toContain('active-class');
    });

    it('should handle false conditional classes', () => {
      const isActive = false;
      const result = cn('base-class', { 'active-class': isActive });
      expect(result).toContain('base-class');
      expect(result).not.toContain('active-class');
    });

    it('should handle arrays of classes', () => {
      const result = cn(['class1', 'class2'], 'class3');
      expect(result).toContain('class1');
      expect(result).toContain('class2');
      expect(result).toContain('class3');
    });

    it('should handle undefined and null values', () => {
      const result = cn('base-class', undefined, null, 'other-class');
      expect(result).toContain('base-class');
      expect(result).toContain('other-class');
    });

    it('should handle multiple class strings', () => {
      const result = cn('px-4 py-2', 'px-6');
      expect(result).toContain('px-6');
      expect(result).toContain('py-2');
      // px-4 is overridden by px-6 in tailwind-merge behavior
      expect(result).not.toContain('px-4');
    });
  });
});
