import { NextResponse } from 'next/server';
import { ZodError } from 'zod';

// Enhanced error types for better error handling
export enum ApiErrorCode {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  AUTHENTICATION_ERROR = 'AUTHENTICATION_ERROR',
  AUTHORIZATION_ERROR = 'AUTHORIZATION_ERROR',
  NOT_FOUND = 'NOT_FOUND',
  CONFLICT = 'CONFLICT',
  RATE_LIMIT = 'RATE_LIMIT',
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
  SUBSCRIPTION_ERROR = 'SUBSCRIPTION_ERROR',
  WEBHOOK_ERROR = 'WEBHOOK_ERROR',
}

export interface ApiError {
  code: ApiErrorCode;
  message: string;
  details?: Record<string, unknown>;
  statusCode: number;
}

export class ApiErrorHandler {
  /**
   * Handle Zod validation errors
   */
  static handleZodError(error: ZodError): NextResponse {
    const formattedErrors = error.issues.map((err) => ({
      field: err.path.join('.'),
      message: err.message,
    }));

    return NextResponse.json(
      {
        error: 'Validation failed',
        code: ApiErrorCode.VALIDATION_ERROR,
        details: { errors: formattedErrors },
      },
      { status: 400 }
    );
  }

  /**
   * Handle generic errors with proper logging
   */
  static handleError(error: unknown, context?: string): NextResponse {
    console.error(`💥 API Error${context ? ` in ${context}` : ''}:`, error);

    if (error instanceof ZodError) {
      return this.handleZodError(error);
    }

    if (error instanceof Error) {
      // Check for specific error types
      if (error.message.includes('Unauthorized') || error.message.includes('authentication')) {
        return this.unauthorized();
      }

      if (error.message.includes('not found')) {
        return this.notFound();
      }

      if (error.message.includes('already exists') || error.message.includes('duplicate')) {
        return this.conflict(error.message);
      }

      // Log the full error for debugging
      console.error('Error stack:', error.stack);
    }

    return this.internalServerError();
  }

  /**
   * Return a 400 Bad Request response
   */
  static badRequest(message = 'Bad request', details?: Record<string, unknown>): NextResponse {
    return NextResponse.json(
      {
        error: message,
        code: ApiErrorCode.VALIDATION_ERROR,
        ...(details && { details }),
      },
      { status: 400 }
    );
  }

  /**
   * Return a 401 Unauthorized response
   */
  static unauthorized(message = 'Unauthorized'): NextResponse {
    return NextResponse.json(
      {
        error: message,
        code: ApiErrorCode.AUTHENTICATION_ERROR,
      },
      { status: 401 }
    );
  }

  /**
   * Return a 403 Forbidden response
   */
  static forbidden(message = 'Forbidden'): NextResponse {
    return NextResponse.json(
      {
        error: message,
        code: ApiErrorCode.AUTHORIZATION_ERROR,
      },
      { status: 403 }
    );
  }

  /**
   * Return a 404 Not Found response
   */
  static notFound(message = 'Not found'): NextResponse {
    return NextResponse.json(
      {
        error: message,
        code: ApiErrorCode.NOT_FOUND,
      },
      { status: 404 }
    );
  }

  /**
   * Return a 409 Conflict response
   */
  static conflict(message = 'Conflict'): NextResponse {
    return NextResponse.json(
      {
        error: message,
        code: ApiErrorCode.CONFLICT,
      },
      { status: 409 }
    );
  }

  /**
   * Return a 429 Too Many Requests response
   */
  static tooManyRequests(message = 'Too many requests'): NextResponse {
    return NextResponse.json(
      {
        error: message,
        code: ApiErrorCode.RATE_LIMIT,
      },
      { status: 429 }
    );
  }

  /**
   * Return a 500 Internal Server Error response
   */
  static internalServerError(message = 'Internal server error'): NextResponse {
    return NextResponse.json(
      {
        error: message,
        code: ApiErrorCode.INTERNAL_SERVER_ERROR,
      },
      { status: 500 }
    );
  }

  /**
   * Return a subscription-specific error
   */
  static subscriptionError(message: string, statusCode = 400): NextResponse {
    return NextResponse.json(
      {
        error: message,
        code: ApiErrorCode.SUBSCRIPTION_ERROR,
      },
      { status: statusCode }
    );
  }

  /**
   * Return a webhook-specific error
   */
  static webhookError(message: string, statusCode = 400): NextResponse {
    return NextResponse.json(
      {
        error: message,
        code: ApiErrorCode.WEBHOOK_ERROR,
      },
      { status: statusCode }
    );
  }
}
