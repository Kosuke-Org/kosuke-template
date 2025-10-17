import { NextResponse } from 'next/server';

/**
 * Type for API metadata values - using unknown is safer than any
 * as it requires type checking before use
 */
export type MetadataValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | MetadataObject
  | MetadataValue[];

export interface MetadataObject {
  [key: string]: MetadataValue;
}

/**
 * Legacy success response structure (for compatibility)
 */
export interface ApiSuccess<T> {
  data: T;
  meta?: MetadataObject;
}

/**
 * Response handler for API routes
 */
export class ApiResponseHandler {
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
