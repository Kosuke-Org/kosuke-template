from enum import Enum


class Operation(str, Enum):
    ADD = "add"
    SUBTRACT = "subtract"
    MULTIPLY = "multiply"
    DIVIDE = "divide"


def calculate(a: float, b: float, op: Operation) -> float:
    """Simple arithmetic used as an example of an engine algorithm."""
    if op == Operation.ADD:
        return a + b
    if op == Operation.SUBTRACT:
        return a - b
    if op == Operation.MULTIPLY:
        return a * b
    if op == Operation.DIVIDE:
        if b == 0:
            msg = "Division by zero is not allowed"
            raise ZeroDivisionError(msg)
        return a / b
    return None
