/**
 * Python Engine HTTP Client
 *
 * Client for calling Python stateless microservice endpoints
 * with retry logic, timeout handling, and proper error handling.
 */

import type { CurrencyConvertRequest, CurrencyConvertResponse } from '@/lib/types';

// ============================================================================
// CONFIGURATION
// ============================================================================

const ENGINE_URL = process.env.ENGINE_URL || 'http://localhost:8000';
const DEFAULT_TIMEOUT = 30000; // 30 seconds
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY = 1000; // 1 second
const RETRY_MULTIPLIER = 2; // Exponential backoff

// ============================================================================
// ERROR TYPES
// ============================================================================

export class EngineError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public endpoint?: string,
    public details?: unknown
  ) {
    super(message);
    this.name = 'EngineError';
  }
}

 class EngineTimeoutError extends EngineError {
  constructor(endpoint: string, timeout: number) {
    super(`Engine request timed out after ${timeout}ms`, 408, endpoint);
    this.name = 'EngineTimeoutError';
  }
}

 class EngineNetworkError extends EngineError {
  constructor(endpoint: string, originalError: unknown) {
    super(`Network error connecting to engine: ${String(originalError)}`, 503, endpoint, {
      originalError,
    });
    this.name = 'EngineNetworkError';
  }
}

// ============================================================================
// REQUEST/RESPONSE TYPES
// ============================================================================

interface CurrencyConvertRequestPayload {
  amount: number;
  from_currency: string;
  to_currency: string;
}

interface CurrencyConvertResponsePayload {
  converted_amount: number;
  from_currency: string;
  to_currency: string;
  exchange_rate: number;
}

// ============================================================================
// CORE REQUEST FUNCTION
// ============================================================================

/**
 * Make HTTP request to Python engine with retry logic
 */
async function callEngine<TRequest, TResponse>(
  endpoint: string,
  payload: TRequest,
  timeout: number = DEFAULT_TIMEOUT
): Promise<TResponse> {
  let lastError: Error | undefined;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      return await makeRequest<TRequest, TResponse>(endpoint, payload, timeout);
    } catch (error) {
      lastError = error as Error;

      // Don't retry on non-retryable errors
      if (error instanceof EngineError) {
        // 4xx errors (except 408 timeout) are not retryable
        if (error.statusCode && error.statusCode >= 400 && error.statusCode < 500) {
          if (error.statusCode !== 408) {
            throw error;
          }
        }
      }

      // Wait before retry (exponential backoff)
      if (attempt < MAX_RETRIES - 1) {
        const delay = INITIAL_RETRY_DELAY * Math.pow(RETRY_MULTIPLIER, attempt);
        await sleep(delay);
      }
    }
  }

  // All retries failed
  throw new EngineError(
    `Engine request failed after ${MAX_RETRIES} attempts: ${lastError?.message}`,
    503,
    endpoint,
    { lastError }
  );
}

/**
 * Make single HTTP request to Python engine
 */
async function makeRequest<TRequest, TResponse>(
  endpoint: string,
  payload: TRequest,
  timeout: number
): Promise<TResponse> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const url = `${ENGINE_URL}${endpoint}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new EngineError(`Engine returned error: ${errorText}`, response.status, endpoint, {
        responseBody: errorText,
      });
    }

    const data = await response.json();
    return data as TResponse;
  } catch (error) {
    // Handle abort/timeout
    if (error instanceof Error && error.name === 'AbortError') {
      throw new EngineTimeoutError(endpoint, timeout);
    }

    // Handle network errors
    if (error instanceof TypeError) {
      throw new EngineNetworkError(endpoint, error);
    }

    // Re-throw EngineError as-is
    if (error instanceof EngineError) {
      throw error;
    }

    // Wrap unknown errors
    throw new EngineError(`Unexpected error calling engine: ${String(error)}`, 500, endpoint, {
      originalError: error,
    });
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Sleep utility for retry backoff
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ============================================================================
// PUBLIC API - FUNCTION EXECUTORS
// ============================================================================

/**
 * Execute currency conversion
 *
 * @param request - Currency conversion request
 * @returns Currency conversion response with converted amount and exchange rate
 */
export async function convertCurrency(
  request: CurrencyConvertRequest
): Promise<CurrencyConvertResponse> {
  const payload: CurrencyConvertRequestPayload = {
    amount: request.amount,
    from_currency: request.from_currency,
    to_currency: request.to_currency,
  };

  const response = await callEngine<CurrencyConvertRequestPayload, CurrencyConvertResponsePayload>(
    '/convert',
    payload
  );

  return {
    converted_amount: response.converted_amount,
    from_currency: response.from_currency as CurrencyConvertRequest['from_currency'],
    to_currency: response.to_currency as CurrencyConvertRequest['to_currency'],
    exchange_rate: response.exchange_rate,
  };
}

// ============================================================================
// HEALTH CHECK
// ============================================================================

/**
 * Check if Python engine is reachable
 *
 * @returns true if engine is healthy, false otherwise
 */
export async function checkEngineHealth(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

    const response = await fetch(`${ENGINE_URL}/health`, {
      method: 'GET',
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Get engine version information
 *
 * @returns Version info or null if unavailable
 */
export async function getEngineVersion(): Promise<{ version: string; python: string } | null> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(`${ENGINE_URL}/version`, {
      method: 'GET',
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return null;
    }

    return await response.json();
  } catch {
    return null;
  }
}
