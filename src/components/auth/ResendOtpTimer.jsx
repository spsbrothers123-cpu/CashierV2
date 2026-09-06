import { useEffect, useState } from 'react';

function formatTime(totalSeconds) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/**
 * "Resend code in 00:45" countdown that flips to an active "Resend OTP"
 * link once it hits zero. `cooldownSeconds` resets the countdown whenever
 * it changes (e.g. bumped after a fresh code is sent).
 */
export function ResendOtpTimer({ cooldownSeconds, onResend, resending }) {
  // "Adjusting state when a prop changes" pattern (React docs): compare
  // against the previous prop value during render instead of syncing via
  // an effect, so a fresh cooldownSeconds resets the countdown immediately.
  const [prevCooldownSeconds, setPrevCooldownSeconds] = useState(cooldownSeconds);
  const [secondsLeft, setSecondsLeft] = useState(cooldownSeconds);
  if (cooldownSeconds !== prevCooldownSeconds) {
    setPrevCooldownSeconds(cooldownSeconds);
    setSecondsLeft(cooldownSeconds);
  }

  useEffect(() => {
    if (secondsLeft <= 0) return undefined;
    const interval = setInterval(() => {
      setSecondsLeft((s) => Math.max(0, s - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [secondsLeft > 0]); // eslint-disable-line react-hooks/exhaustive-deps

  if (secondsLeft > 0) {
    return (
      <p className="text-center text-sm text-charcoal-500">
        Resend code in <span className="font-medium text-charcoal-800">{formatTime(secondsLeft)}</span>
      </p>
    );
  }

  return (
    <button
      type="button"
      onClick={onResend}
      disabled={resending}
      className="mx-auto block text-sm font-semibold text-egg-600 hover:underline disabled:opacity-50"
    >
      {resending ? 'Resending...' : 'Resend OTP'}
    </button>
  );
}
