/**
 * Types for the engine service
 */

export type CurrencyCode = 'USD' | 'EUR' | 'GBP' | 'JPY' | 'CAD' | 'AUD' | 'CHF' | 'CNY';

export interface CurrencyConvertRequest {
  amount: number;
  from_currency: CurrencyCode;
  to_currency: CurrencyCode;
}

export interface CurrencyConvertResponse {
  converted_amount: number;
  from_currency: CurrencyCode;
  to_currency: CurrencyCode;
  exchange_rate: number;
}
