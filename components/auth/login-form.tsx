'use client';

import { Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { FormEvent, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { authApi } from '@/lib/api/client';

export function Login({ mode = 'signin' }: { mode?: 'signin' | 'signup' }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect');
  const priceId = searchParams.get('priceId');
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      // Use the appropriate API function based on mode
      const response = mode === 'signin' 
        ? await authApi.signIn(email, password)
        : await authApi.signUp(email, password);
      
      if (response.error) {
        setError(response.error);
      } else {
        // Redirect to dashboard or the redirect URL if provided
        router.push(redirect || '/dashboard');
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
      console.error('Authentication error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col justify-center w-full max-w-sm">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">{mode === 'signin' ? 'Login' : 'Sign Up'}</CardTitle>
          <CardDescription>
            Enter your email below to{' '}
            {mode === 'signin' ? 'login to your account' : 'create a new account'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit}>
            <div className="flex flex-col gap-6">
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="m@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  maxLength={50}
                />
              </div>

              <div className="grid gap-2">
                <div className="flex items-center">
                  <Label htmlFor="password">Password</Label>
                  {mode === 'signin' && (
                    <Link
                      href="/forgot-password"
                      className="ml-auto inline-block text-sm underline-offset-4 hover:underline"
                    >
                      Forgot your password?
                    </Link>
                  )}
                </div>
                <Input
                  id="password"
                  type="password"
                  autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  maxLength={100}
                />
              </div>

              {error && (
                <div className="rounded-md bg-destructive/10 p-3">
                  <div className="text-sm text-destructive">{error}</div>
                </div>
              )}

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="animate-spin mr-2 h-4 w-4" />
                    Loading...
                  </>
                ) : mode === 'signin' ? (
                  'Login'
                ) : (
                  'Sign Up'
                )}
              </Button>
            </div>

            <div className="mt-4 text-center text-sm">
              {mode === 'signin' ? "Don't have an account? " : 'Already have an account? '}
              <Link
                href={`${mode === 'signin' ? '/sign-up' : '/sign-in'}${
                  redirect ? `?redirect=${redirect}` : ''
                }${priceId ? `&priceId=${priceId}` : ''}`}
                className="underline underline-offset-4"
              >
                {mode === 'signin' ? 'Sign up' : 'Login'}
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
