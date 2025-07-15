'use client';

import { ClerkProvider } from '@clerk/nextjs';
import { ReactNode } from 'react';

interface ClerkThemeProviderProps {
  children: ReactNode;
}

export function ClerkThemeProvider({ children }: ClerkThemeProviderProps) {
  return (
    <ClerkProvider
      appearance={{
        variables: {
          colorPrimary: 'hsl(var(--primary))',
          colorBackground: 'hsl(var(--background))',
          colorInputBackground: 'hsl(var(--input))',
          colorInputText: 'hsl(var(--foreground))',
          colorText: 'hsl(var(--foreground))',
          colorTextSecondary: 'hsl(var(--muted-foreground))',
          colorNeutral: 'hsl(var(--muted))',
          colorDanger: 'hsl(var(--destructive))',
          colorSuccess: 'hsl(var(--primary))',
          colorWarning: 'hsl(var(--secondary))',
          fontFamily: 'var(--font-geist-sans)',
          borderRadius: '0.5rem',
        },
        elements: {
          // Main containers - preserve borders but remove gradients
          rootBox: {
            backgroundColor: 'hsl(var(--background))',
            backgroundImage: 'none',
            boxShadow: 'none',
            border: '1px solid hsl(var(--border))',
            borderRadius: '0.5rem',
          },
          main: {
            backgroundColor: 'hsl(var(--background))',
            backgroundImage: 'none',
            boxShadow: 'none',
          },
          card: {
            backgroundColor: 'hsl(var(--card))',
            background: 'hsl(var(--card))',
            backgroundImage: 'none',
            boxShadow: 'none',
          },
          // Form elements
          formButtonPrimary: {
            backgroundColor: 'hsl(var(--primary))',
            color: 'hsl(var(--primary-foreground))',
            boxShadow: 'none',
            backgroundImage: 'none',
            border: 'none',
            '&:hover': {
              backgroundColor: 'hsl(var(--primary) / 0.9)',
              boxShadow: 'none',
            },
          },
          headerTitle: {
            color: 'hsl(var(--foreground))',
          },
          headerSubtitle: {
            color: 'hsl(var(--muted-foreground))',
          },
          socialButtonsBlockButton: {
            backgroundColor: 'hsl(var(--secondary))',
            color: 'hsl(var(--secondary-foreground))',
            border: '1px solid hsl(var(--border))',
            boxShadow: 'none',
            backgroundImage: 'none',
            '&:hover': {
              backgroundColor: 'hsl(var(--secondary) / 0.8)',
              boxShadow: 'none',
            },
          },
          formFieldInput: {
            backgroundColor: 'hsl(var(--input))',
            borderColor: 'hsl(var(--border))',
            color: 'hsl(var(--foreground))',
            boxShadow: 'none',
            backgroundImage: 'none',
            '&:focus': {
              borderColor: 'hsl(var(--ring))',
              boxShadow: '0 0 0 2px hsl(var(--ring) / 0.2)',
            },
          },
          formFieldLabel: {
            color: 'hsl(var(--foreground))',
          },
          dividerLine: {
            backgroundColor: 'hsl(var(--border))',
          },
          dividerText: {
            color: 'hsl(var(--muted-foreground))',
          },
          footer: {
            backgroundColor: 'transparent',
            backgroundImage: 'none',
          },
          footerActionLink: {
            color: 'hsl(var(--primary))',
            '&:hover': {
              color: 'hsl(var(--primary) / 0.8)',
            },
          },
          // Modal and popup elements
          modalContent: {
            backgroundColor: 'hsl(var(--background))',
            background: 'hsl(var(--background))',
            backgroundImage: 'none',
            border: '1px solid hsl(var(--border))',
            boxShadow: 'none',
          },
          modalCloseButton: {
            color: 'hsl(var(--muted-foreground))',
            '&:hover': {
              color: 'hsl(var(--foreground))',
            },
          },
          identityPreviewEditButton: {
            color: 'hsl(var(--primary))',
          },
          userButtonPopoverCard: {
            backgroundColor: 'hsl(var(--card))',
            border: '1px solid hsl(var(--border))',
            boxShadow: 'none',
            backgroundImage: 'none',
          },
          userButtonPopoverActionButton: {
            color: 'hsl(var(--foreground))',
            '&:hover': {
              backgroundColor: 'hsl(var(--accent))',
            },
          },
        },
      }}
    >
      {children}
    </ClerkProvider>
  );
}
