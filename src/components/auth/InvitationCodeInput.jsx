import { useRef } from 'react';
import { cn } from '@/utils/cn';

const LENGTH = 6;

/**
 * Six individual digit boxes for entering the 6-digit invitation code an
 * Admin hands out to a new cashier. `value` is the full code string (may be
 * shorter than LENGTH while typing); `onChange` always receives the full
 * updated string. Handles auto-advance, backspace-to-previous, numeric-only
 * input, and pasting a full code into any box.
 */
export function InvitationCodeInput({ value, onChange, disabled, error, status = 'idle', id = 'invitation-code' }) {
  const inputsRef = useRef([]);
  const digits = value.split('');

  function setDigitAt(index, digit) {
    const next = value.split('');
    next[index] = digit;
    onChange(next.join('').slice(0, LENGTH));
  }

  function handleChange(index, e) {
    const raw = e.target.value.replace(/\D/g, '');
    if (!raw) {
      setDigitAt(index, '');
      return;
    }
    // Handle a paste-like burst landing in one box, or plain single-digit typing.
    if (raw.length > 1) {
      const merged = (value.slice(0, index) + raw).slice(0, LENGTH);
      onChange(merged);
      const nextIndex = Math.min(merged.length, LENGTH - 1);
      inputsRef.current[nextIndex]?.focus();
      return;
    }
    setDigitAt(index, raw[raw.length - 1]);
    if (index < LENGTH - 1) inputsRef.current[index + 1]?.focus();
  }

  function handleKeyDown(index, e) {
    if (e.key === 'Backspace') {
      if (digits[index]) {
        setDigitAt(index, '');
      } else if (index > 0) {
        setDigitAt(index - 1, '');
        inputsRef.current[index - 1]?.focus();
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputsRef.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < LENGTH - 1) {
      inputsRef.current[index + 1]?.focus();
    }
  }

  function handlePaste(e) {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, LENGTH);
    if (!pasted) return;
    e.preventDefault();
    onChange(pasted);
    inputsRef.current[Math.min(pasted.length, LENGTH - 1)]?.focus();
  }

  const boxState =
    status === 'error' || error
      ? 'border-danger-500 text-danger-600 focus:border-danger-500'
      : status === 'success'
        ? 'border-success-600 text-success-600'
        : 'border-charcoal-900/12 text-charcoal-900 focus:border-egg-500';

  return (
    <div>
      <div className="flex justify-between gap-2" role="group" aria-label="Invitation code">
        {Array.from({ length: LENGTH }).map((_, i) => (
          <input
            key={i}
            ref={(el) => (inputsRef.current[i] = el)}
            id={i === 0 ? id : undefined}
            type="text"
            inputMode="numeric"
            autoComplete="off"
            pattern="\d*"
            maxLength={1}
            value={digits[i] || ''}
            onChange={(e) => handleChange(i, e)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            onPaste={handlePaste}
            disabled={disabled}
            aria-label={`Digit ${i + 1} of ${LENGTH}`}
            aria-invalid={!!error}
            className={cn(
              'h-12 w-full max-w-12 rounded-[10px] border bg-surface-white text-center font-display text-lg font-semibold outline-none transition-colors duration-150 disabled:opacity-50',
              boxState
            )}
          />
        ))}
      </div>
      {error && (
        <p className="mt-2 text-center text-sm text-danger-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
