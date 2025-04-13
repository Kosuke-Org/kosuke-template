import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { ApiErrorHandler } from '@/lib/api/errors';
import { getUser } from '@/lib/db/queries';
import { User } from '@/lib/db/schema';

import { getSession } from './session';

export type ActionState = {
  error?: string;
  success?: string;
  [key: string]: unknown; // This allows for additional properties
};

type ValidatedActionFunction<Schema extends z.ZodType, ReturnType> = (
  data: z.infer<Schema>,
  formData: FormData
) => Promise<ReturnType>;

export function validatedAction<Schema extends z.ZodType, ReturnType>(
  schema: Schema,
  action: ValidatedActionFunction<Schema, ReturnType>
) {
  return async (prevState: ActionState, formData: FormData): Promise<ReturnType> => {
    const result = schema.safeParse(Object.fromEntries(formData));
    if (!result.success) {
      return { error: result.error.errors[0].message } as ReturnType;
    }

    return action(result.data, formData);
  };
}

type ValidatedActionWithUserFunction<Schema extends z.ZodType, ReturnType> = (
  data: z.infer<Schema>,
  formData: FormData,
  user: User
) => Promise<ReturnType>;

export function validatedActionWithUser<Schema extends z.ZodType, ReturnType>(
  schema: Schema,
  action: ValidatedActionWithUserFunction<Schema, ReturnType>
) {
  return async (prevState: ActionState, formData: FormData): Promise<ReturnType> => {
    const user = await getUser();
    if (!user) {
      throw new Error('User is not authenticated');
    }

    const result = schema.safeParse(Object.fromEntries(formData));
    if (!result.success) {
      return { error: result.error.errors[0].message } as ReturnType;
    }

    return action(result.data, formData, user);
  };
}

export interface RouteContext {
  params: Record<string, string>;
  [key: string]: unknown;
}

export type RouteHandler = (
  req: NextRequest,
  context: RouteContext,
  session: { user: { id: number } }
) => Promise<NextResponse>;

/**
 * Higher-order function that wraps API route handlers with authentication
 * @param handler The route handler function to wrap
 * @returns A wrapped handler that checks authentication before executing
 */
export function withAuth(handler: RouteHandler) {
  return async (req: NextRequest, context: RouteContext) => {
    try {
      // Get the session
      const session = await getSession();
      if (!session) {
        return ApiErrorHandler.unauthorized();
      }

      // Call the original handler with the session
      return handler(req, context, session);
    } catch (error) {
      return ApiErrorHandler.handle(error);
    }
  };
}
