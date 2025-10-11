from enum import Enum


class Currency(str, Enum):
    USD = "USD"
    EUR = "EUR"
    GBP = "GBP"
    JPY = "JPY"
    CAD = "CAD"
    AUD = "AUD"
    CHF = "CHF"
    CNY = "CNY"


# Mock exchange rates
EXCHANGE_RATES = {
    "USD": 1.0,
    "EUR": 0.85,
    "GBP": 0.73,
    "JPY": 110.0,
    "CAD": 1.25,
    "AUD": 1.35,
    "CHF": 0.92,
    "CNY": 6.45,
}


def convert_currency(amount: float, from_currency: Currency, to_currency: Currency) -> float:
    """Convert currency amount from one currency to another.

    This is a mock implementation using hardcoded rates.
    In production, you'd fetch real-time rates from a financial API.
    """
    if amount < 0:
        msg = "Amount cannot be negative"
        raise ValueError(msg)

    if from_currency == to_currency:
        return amount

    # Convert to USD first, then to target currency
    usd_amount = amount / EXCHANGE_RATES[from_currency.value]
    converted_amount = usd_amount * EXCHANGE_RATES[to_currency.value]

    return round(converted_amount, 2)
