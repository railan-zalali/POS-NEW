export interface RetryOptions {
  maxAttempts?: number;
  initialDelay?: number;
  maxDelay?: number;
  backoffMultiplier?: number;
  shouldRetry?: (error: unknown) => boolean;
  onRetry?: (attempt: number, error: unknown) => void;
}

export interface RetryResult<T> {
  success: boolean;
  data?: T;
  error?: unknown;
  attempts: number;
}

/**
 * Retry a function with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {},
): Promise<RetryResult<T>> {
  const {
    maxAttempts = 3,
    initialDelay = 1000,
    maxDelay = 30000,
    backoffMultiplier = 2,
    shouldRetry = defaultShouldRetry,
    onRetry,
  } = options;

  let lastError: unknown;
  let attempt = 0;

  while (attempt < maxAttempts) {
    attempt++;

    try {
      const data = await fn();
      return {
        success: true,
        data,
        attempts: attempt,
      };
    } catch (error) {
      lastError = error;

      // Check if we should retry
      if (!shouldRetry(error) || attempt >= maxAttempts) {
        return {
          success: false,
          error,
          attempts: attempt,
        };
      }

      // Calculate delay with exponential backoff
      const delay = Math.min(initialDelay * Math.pow(backoffMultiplier, attempt - 1), maxDelay);

      // Call onRetry callback if provided
      if (onRetry) {
        onRetry(attempt, error);
      }

      // Wait before retrying
      await sleep(delay);
    }
  }

  return {
    success: false,
    error: lastError,
    attempts: attempt,
  };
}

/**
 * Sleep for a given number of milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Default retry condition - retry on network errors and certain status codes
 */
function defaultShouldRetry(error: unknown): boolean {
  if (!error) return false;

  if (error instanceof Error) {
    // Retry on network errors
    if (
      error.message.includes('fetch failed') ||
      error.message.includes('network') ||
      error.message.includes('ECONNREFUSED') ||
      error.message.includes('ETIMEDOUT') ||
      error.message.includes('ENOTFOUND') ||
      error.message.includes('5xx') ||
      error.message.includes('503') ||
      error.message.includes('502') ||
      error.message.includes('timeout')
    ) {
      return true;
    }

    // Retry on rate limit errors
    if (error.message.includes('429') || error.message.includes('rate limit')) {
      return true;
    }
  }

  return false;
}

/**
 * Retry queue for managing multiple pending retries
 */
export class RetryQueue<T> {
  private queue: Array<{
    fn: () => Promise<T>;
    options?: RetryOptions;
    resolve: (result: RetryResult<T>) => void;
  }> = [];
  private isProcessing = false;
  private maxConcurrent = 3;

  async add(fn: () => Promise<T>, options?: RetryOptions): Promise<RetryResult<T>> {
    return new Promise((resolve) => {
      this.queue.push({ fn, options, resolve });
      this.process();
    });
  }

  private async process() {
    if (this.isProcessing || this.queue.length === 0) {
      return;
    }

    this.isProcessing = true;

    // Process up to maxConcurrent items
    const itemsToProcess = this.queue.splice(0, Math.min(this.maxConcurrent, this.queue.length));

    await Promise.all(
      itemsToProcess.map(async (item) => {
        const result = await retryWithBackoff(item.fn, item.options);
        item.resolve(result);
      }),
    );

    this.isProcessing = false;

    // Process next batch if there are more items
    if (this.queue.length > 0) {
      this.process();
    }
  }

  clear() {
    this.queue = [];
  }

  setMaxConcurrent(max: number) {
    this.maxConcurrent = max;
  }
}

/**
 * Create a debounced retry wrapper
 */
export function createRetryableOperation<T>(fn: () => Promise<T>, options?: RetryOptions) {
  let retryPromise: Promise<RetryResult<T>> | null = null;

  return {
    execute: (): Promise<RetryResult<T>> => {
      // Return existing promise if operation is in progress
      if (retryPromise) {
        return retryPromise;
      }

      retryPromise = retryWithBackoff(fn, options);

      // Clear promise after completion
      retryPromise.finally(() => {
        retryPromise = null;
      });

      return retryPromise;
    },
    cancel: () => {
      // Note: This is a simple cancel - in production you might want more sophisticated cancellation
      retryPromise = null;
    },
  };
}
