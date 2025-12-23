import { NextResponse } from 'next/server';

/**
 * Type for API metadata values - using unknown is safer than any
 * as it requires type checking before use
 */
type MetadataValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | MetadataObject
  | MetadataValue[];

interface MetadataObject {
  [key: string]: MetadataValue;
}

/**
 * Legacy success response structure (for compatibility)
 */
interface ApiSuccess<T> {
  data: T;
  meta?: MetadataObject;
}

/**
 * Response handler for API routes
 */
export class ApiResponseHandler {
  /**
   * Create an unauthorized response (401)
   */
  static unauthorized(): NextResponse {
    return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 });
  }

  /**
   * Create a bad request response (400)
   */
  static badRequest(message: string): NextResponse {
    return NextResponse.json({ error: message, code: 'BAD_REQUEST' }, { status: 400 });
  }

  /**
   * Create a forbidden response (403)
   */

  static forbidden(message: string): NextResponse {
    return NextResponse.json({ error: message, code: 'FORBIDDEN' }, { status: 403 });
  }

  /**
   * Create an internal server error response (500)
   */
  static internalServerError(message: string): NextResponse {
    return NextResponse.json({ error: message, code: 'INTERNAL_SERVER_ERROR' }, { status: 500 });
  }

  /**
   * Create a not found response (404)
   */
  static notFound(message: string): NextResponse {
    return NextResponse.json({ error: message, code: 'NOT_FOUND' }, { status: 404 });
  }

  /**
   * Create a success response (200)
   */
  static success<T>(data: T, meta?: MetadataObject): NextResponse<ApiSuccess<T>> {
    return NextResponse.json({ data, ...(meta ? { meta } : {}) }, { status: 200 });
  }

  /**
   * Create a created response (201)
   */
  static created<T>(data: T, meta?: MetadataObject): NextResponse<ApiSuccess<T>> {
    return NextResponse.json({ data, ...(meta ? { meta } : {}) }, { status: 201 });
  }

  /**
   * Create a no content response (204)
   */
  static noContent(): NextResponse {
    return new NextResponse(null, { status: 204 });
  }

  /**
   * Create a paginated response
   */
  static paginated<T>(
    data: T[],
    {
      page,
      pageSize,
      total,
      hasMore,
    }: {
      page: number;
      pageSize: number;
      total: number;
      hasMore: boolean;
    }
  ): NextResponse<ApiSuccess<T[]>> {
    return NextResponse.json(
      {
        data,
        meta: {
          pagination: {
            page,
            pageSize,
            total,
            totalPages: Math.ceil(total / pageSize),
            hasMore,
          },
        },
      },
      { status: 200 }
    );
  }
}
