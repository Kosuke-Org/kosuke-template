import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { ApiResponseHandler } from '@/lib/api';
import type { 
  CurrencyConvertRequest, 
  CurrencyConvertResponse 
} from '@/lib/types';

const ENGINE_SERVICE_URL = process.env.ENGINE_SERVICE_URL || 'http://localhost:8000';

async function proxyToEngine<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${ENGINE_SERVICE_URL}${endpoint}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Engine service error: ${response.status} ${errorText}`);
  }

  return response.json();
}

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
    const result = await proxyToEngine<CurrencyConvertResponse>('/convert', {
      method: 'POST',
      body: JSON.stringify(body),
    });

    return ApiResponseHandler.success(result);
  } catch (error) {
    console.error('Currency conversion failed:', error);
    
    // Handle specific error cases
    if (error instanceof Error) {
      if (error.message.includes('Invalid currency code')) {
        return NextResponse.json(
          { 
            success: false, 
            error: 'Invalid currency',
            message: 'Invalid currency code provided'
          },
          { status: 400 }
        );
      }
      
      if (error.message.includes('Engine service error')) {
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