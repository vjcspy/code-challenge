import { AsyncLocalStorage } from 'async_hooks';

/**
 * Request Context
 * Stored in AsyncLocalStorage for automatic propagation
 */
export interface RequestContext {
  correlationId: string;
  method?: string;
  path?: string;
  startTime?: number;
}

/**
 * AsyncLocalStorage instance for request context
 * This allows us to access request context anywhere in the call stack
 * without explicitly passing it through function parameters
 */
export const requestContext = new AsyncLocalStorage<RequestContext>();

/**
 * Get current request context
 * Returns undefined if called outside of request context
 */
export function getContext(): RequestContext | undefined {
  return requestContext.getStore();
}

/**
 * Get correlation ID from current context
 * Returns 'no-context' if called outside of request context
 */
export function getCorrelationId(): string {
  return getContext()?.correlationId || 'no-context';
}

/**
 * Run a function within a request context
 */
export function runWithContext<T>(context: RequestContext, fn: () => T): T {
  return requestContext.run(context, fn);
}

