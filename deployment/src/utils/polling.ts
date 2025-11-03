interface PollingOptions {
  maxAttempts?: number;
  delayMs?: number;
}

export async function poll<T>(
  checkFn: (attempt: number) => Promise<{ status: string; data?: T }>,
  successStates: string[],
  failureStates: string[],
  options: PollingOptions = {}
): Promise<T | undefined> {
  const { maxAttempts = 30, delayMs = 5000 } = options;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const { status, data } = await checkFn(attempt);

    if (successStates.includes(status)) {
      console.log(`✅ Status: ${status}`);
      return data;
    }

    if (failureStates.includes(status)) {
      throw new Error(`Operation failed with status: ${status}`);
    }

    console.log(`  Status: ${status} (attempt ${attempt}/${maxAttempts})`);
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }

  throw new Error(`Operation did not complete after ${maxAttempts} attempts`);
}
