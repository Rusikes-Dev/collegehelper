import { NextResponse } from 'next/server';

/** Shape every route returns, so the client can render errors uniformly. */
export interface ApiError { error: string; code: string }

export function apiError(message: string, code: string, status: number) {
  return NextResponse.json<ApiError>({ error: message, code }, { status });
}

/**
 * Converts a thrown value into a safe response. Internal details are logged,
 * never sent: users see a sentence they can act on, not a stack trace.
 */
export function handleError(e: unknown) {
  const err = e as { status?: number; code?: string; message?: string; name?: string };

  if (err?.name === 'DatasetMissingError') {
    console.error('[api] dataset missing', err.message);
    return apiError('College data is being updated. Please try again shortly.', 'DATA_UNAVAILABLE', 503);
  }
  if (typeof err?.status === 'number' && err.status < 500) {
    return apiError(err.message ?? 'Request failed.', err.code ?? 'BAD_REQUEST', err.status);
  }

  // Deliberate 5xx: thrown by us, with a code and a message already written for
  // the reader. Without this branch a deployment missing its Razorpay keys tells
  // students "something went wrong on our side" and tells the operator nothing.
  if (typeof err?.status === 'number' && err.status >= 500 && err.code) {
    console.error('[api]', err.code, err.message);
    return apiError(err.message ?? 'Service unavailable.', err.code, err.status);
  }

  console.error('[api] unhandled error', e);
  return apiError('Something went wrong on our side. Please try again.', 'INTERNAL', 500);
}
