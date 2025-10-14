import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { ApiResponseHandler } from '@/lib/api';
import { convertCurrency, EngineError } from '@/lib/engine/client';
import type { 
  CurrencyConvertRequest
} from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Unauthorized',
          message: 'Authentication required'
        },
        { status: 401 }
      );
    }

    // Parse request body
    const body: CurrencyConvertRequest = await request.json();
    
    // Validate required fields
    if (!body.amount || !body.from_currency || !body.to_currency) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid request',
          message: 'Missing required fields: amount, from_currency, to_currency'
        },
        { status: 400 }
      );
    }

    // Validate amount
    if (body.amount < 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid amount',
          message: 'Amount cannot be negative'
        },
        { status: 400 }
      );
    }

    // Call engine service
    const result = await convertCurrency(body);

    return ApiResponseHandler.success(result);
  } catch (error) {
    console.error('Currency conversion failed:', error);
    
    // Handle EngineError specifically
    if (error instanceof EngineError) {
      if (error.statusCode === 400) {
        return NextResponse.json(
          { 
            success: false, 
            error: 'Invalid request',
            message: error.message
          },
          { status: 400 }
        );
      }
      
      if (error.statusCode === 503 || error instanceof EngineError) {
        return NextResponse.json(
          { 
            success: false, 
            error: 'Engine service unavailable',
            message: 'Unable to process currency conversion'
          },
          { status: 503 }
        );
      }
    }

    return NextResponse.json(
      { 
        success: false, 
        error: 'Conversion failed',
        message: 'An unexpected error occurred during currency conversion'
      },
      { status: 500 }
    );
  }
}