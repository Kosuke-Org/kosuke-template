/**
 * Currency Converter
 * Example component to show how to use the engine service for advanced calculations
 */

'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { trpc } from '@/lib/trpc/client';
import { useToast } from '@/hooks/use-toast';
import type { CurrencyCode } from '@/lib/types';

const CURRENCIES: CurrencyCode[] = ['USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'CHF', 'CNY'];

export function CurrencyConverter() {
  const [amount, setAmount] = useState('100');
  const [fromCurrency, setFromCurrency] = useState<CurrencyCode>('USD');
  const [toCurrency, setToCurrency] = useState<CurrencyCode>('EUR');
  const { toast } = useToast();

  const convertMutation = trpc.engine.convert.useMutation({
    onSuccess: (data) => {
      toast({
        title: 'Conversion successful',
        description: `${data.from_currency} ${amount} = ${data.to_currency} ${data.converted_amount.toFixed(2)}`,
      });
    },
    onError: (error) => {
      toast({
        title: 'Conversion failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const convert = async () => {
    if (!amount || !fromCurrency || !toCurrency) return;

    // Validate amount before sending
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount < 0) {
      toast({
        title: 'Invalid amount',
        description: 'Please enter a valid positive number',
        variant: 'destructive',
      });
      return;
    }

    try {
      await convertMutation.mutateAsync({
        amount: numAmount,
        from_currency: fromCurrency,
        to_currency: toCurrency,
      });
    } catch (_error) {
      // Error handling is done in the mutation's onError callback
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Currency Converter</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Input
          type="number"
          placeholder="Amount"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />

        <div className="grid grid-cols-2 gap-2">
          <Select
            value={fromCurrency}
            onValueChange={(value) => setFromCurrency(value as CurrencyCode)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CURRENCIES.map((currency) => (
                <SelectItem key={currency} value={currency}>
                  {currency}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={toCurrency}
            onValueChange={(value) => setToCurrency(value as CurrencyCode)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CURRENCIES.map((currency) => (
                <SelectItem key={currency} value={currency}>
                  {currency}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button onClick={convert} disabled={convertMutation.isPending} className="w-full">
          {convertMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Convert'}
        </Button>

        {convertMutation.error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md">
            <div className="text-sm text-red-800 font-medium">Error</div>
            <div className="text-sm text-red-700">{convertMutation.error.message}</div>
          </div>
        )}

        {convertMutation.data && (
          <div className="text-center text-lg font-semibold">
            {convertMutation.data.converted_amount.toFixed(2)} {convertMutation.data.to_currency}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
