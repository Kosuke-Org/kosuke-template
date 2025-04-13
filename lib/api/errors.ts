import { NextResponse } from 'next/server';
import { ZodError } from 'zod';

/**
 * Type for error details - similar to MetadataValue but specific to errors
 */
export type ErrorDetail =
  | string
  | number
  | boolean
  | null
  | undefined
  | ErrorDetailObject
  | ErrorDetail[];

export interface ErrorDetailObject {
  [key: string]: ErrorDetail;
}

/**
 * Standard error response structure
 */
export interface ApiError {
  error: string;
  details?: ErrorDetailObject;
  code?: string;
}

/**
 * Type for handleable errors
 */
export type HandleableError = Error | ZodError | { message: string } | unknown;

/**
 * Error handler for API routes
 */
export class ApiErrorHandler {
  /**
   * Handle an error in a uniform way
   */
  static handle(error: unknown): NextResponse {
    console.error('API Error:', error);

    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ error: 'An unknown error occurred' }, { status: 500 });
  }

  /**
   * Return a 400 Bad Request response
   */
  static badRequest(message = 'Bad request'): NextResponse {
    return NextResponse.json({ error: message }, { status: 400 });
  }

  /**
   * Return a 401 Unauthorized response
   */
  static unauthorized(message = 'Unauthorized'): NextResponse {
    return NextResponse.json({ error: message }, { status: 401 });
  }

  /**
   * Return a 403 Forbidden response
   */
  static forbidden(message = 'Forbidden'): NextResponse {
    return NextResponse.json({ error: message }, { status: 403 });
  }

  /**
   * Return a 404 Not Found response
   */
  static notFound(message = 'Not found'): NextResponse {
    return NextResponse.json({ error: message }, { status: 404 });
  }

  /**
   * Handle validation errors (400)
   */
  static validationError(error: ZodError): NextResponse<ApiError> {
    return NextResponse.json(
      {
        error: 'Validation error',
        details: error.format(),
        code: 'VALIDATION_ERROR',
      },
      { status: 400 }
    );
  }

  /**
   * Handle internal server errors (500)
   */
  static serverError(error: HandleableError): NextResponse<ApiError> {
    console.error('Server error:', error);

    const errorMessage = error instanceof Error ? error.message : String(error);

    return NextResponse.json(
      {
        error: 'Internal server error',
        code: 'SERVER_ERROR',
        details: process.env.NODE_ENV === 'development' ? { message: errorMessage } : undefined,
      },
      { status: 500 }
    );
  }

  /**
   * Handle any error with appropriate status code
   */
  static handleError(error: HandleableError): NextResponse<ApiError> {
    if (error instanceof ZodError) {
      return this.validationError(error);
    }

    return this.serverError(error);
  }
}
