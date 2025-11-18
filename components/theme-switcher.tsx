'use client';

import { useEffect, useState } from 'react';

import { useTheme } from 'next-themes';

import { Monitor, Moon, Sun } from 'lucide-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const themes = [
  {
    name: 'Light',
    value: 'light',
    icon: Sun,
    description: 'Clean and bright interface',
  },
  {
    name: 'Dark',
    value: 'dark',
    icon: Moon,
    description: 'Easy on the eyes',
  },
  {
    name: 'System',
    value: 'system',
    icon: Monitor,
    description: 'Adapts to your system preference',
  },
] as const;

export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="grid grid-cols-3 gap-4">
        {themes.map((themeOption) => (
          <div
            key={themeOption.value}
            className="bg-muted/50 h-32 animate-pulse rounded-lg border"
          />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {themes.map((themeOption) => {
          const Icon = themeOption.icon;
          const isSelected = theme === themeOption.value;

          return (
            <Card
              key={themeOption.value}
              className={`cursor-pointer transition-all duration-200 hover:shadow-md ${
                isSelected
                  ? 'ring-primary border-primary shadow-md ring-2'
                  : 'hover:border-primary/50'
              }`}
              onClick={() => setTheme(themeOption.value)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <Icon
                    className={`h-5 w-5 ${isSelected ? 'text-primary' : 'text-muted-foreground'}`}
                  />
                  {isSelected && <div className="bg-primary h-2 w-2 rounded-full" />}
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <CardTitle className="mb-1 text-sm font-medium">{themeOption.name}</CardTitle>
                <CardDescription className="text-xs">{themeOption.description}</CardDescription>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="text-muted-foreground text-sm">
        <p>Choose how the interface looks. Select a single theme, or sync with your system.</p>
      </div>
    </div>
  );
}
