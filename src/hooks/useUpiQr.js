import { useCallback, useEffect, useState } from 'react';
import { requestUpiQr } from '@/api/upi';
import { paiseToAmountString, verifyUpiQrPayload, UPI_ERROR_CODES } from '@/utils/upi';

const EMPTY = { forPaise: null, status: 'idle', data: null, error: null };

/**
 * Loads the receiver + QR for ONE specific payable amount (integer paise).
 *
 * status: 'invalid' | 'loading' | 'ready' | 'unconfigured' | 'error'
 *
 * - paise === null (zero / invalid amount) -> 'invalid', no request is made.
 * - A result is only ever shown for the exact amount it was requested for;
 *   if the amount changes, the old QR is discarded (reported as 'loading')
 *   and a new one is requested. Stale responses are ignored/aborted.
 * - A QR is only 'ready' after verifyUpiQrPayload() confirms the encoded
 *   amount/currency/payee match. Displaying a QR never implies payment.
 */
export function useUpiQr(paise) {
  const [result, setResult] = useState(EMPTY);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (paise === null) return undefined;
    const controller = new AbortController();
    let active = true;

    requestUpiQr({ amount: paiseToAmountString(paise), signal: controller.signal })
      .then((data) => {
        if (!active) return;
        const problem = verifyUpiQrPayload(data, paise);
        setResult(
          problem
            ? { forPaise: paise, status: 'error', data: null, error: { message: problem } }
            : { forPaise: paise, status: 'ready', data, error: null }
        );
      })
      .catch((err) => {
        if (!active) return;
        setResult({
          forPaise: paise,
          status: err?.code === UPI_ERROR_CODES.NOT_CONFIGURED ? 'unconfigured' : 'error',
          data: null,
          error: err,
        });
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [paise, attempt]);

  const retry = useCallback(() => {
    setResult(EMPTY);
    setAttempt((a) => a + 1);
  }, []);

  if (paise === null) return { status: 'invalid', data: null, error: null, retry };
  if (result.forPaise !== paise) return { status: 'loading', data: null, error: null, retry };
  return { status: result.status, data: result.data, error: result.error, retry };
}
