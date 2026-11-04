// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';
import { apiClient } from '@/api/client';
import { ForgotPasswordPage } from '@/pages/cashier/ForgotPasswordPage';
import { Navigate } from 'react-router-dom';

const GENERIC = { success: true, data: null, message: 'If this account is eligible, a recovery request has been sent to your administrator.' };

function LocationProbe() {
  const loc = useLocation();
  return <div data-testid="loc">{loc.pathname + loc.search + loc.hash}</div>;
}

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/cashier/forgot-password']}>
      <LocationProbe />
      <Routes>
        <Route path="/cashier/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/cashier/login" element={<div>LOGIN PAGE</div>} />
      </Routes>
    </MemoryRouter>
  );
}

let post;
beforeEach(() => {
  post = vi.spyOn(apiClient, 'post');
  localStorage.clear();
  sessionStorage.clear();
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

async function fileRequest(user, email = 'meena@eggmart.test') {
  await user.type(screen.getByLabelText('Registered email'), email);
  await user.click(screen.getByRole('button', { name: /request recovery/i }));
}

describe('Cashier forgot password (admin-assisted)', () => {
  it('files a request against the real endpoint and shows the generic notice', async () => {
    post.mockResolvedValueOnce({ data: GENERIC });
    const user = userEvent.setup();
    renderPage();
    await fileRequest(user);
    expect(post).toHaveBeenCalledWith('/auth/cashier-recovery/request', { email: 'meena@eggmart.test' });
    expect(await screen.findByText(/recovery request has been sent to your administrator/i)).toBeTruthy();
    expect(screen.getByText(/Expires in about (15:00|14:5\d)/)).toBeTruthy();
  });

  it('shows the identical screen whatever the email (no account enumeration)', async () => {
    post.mockResolvedValue({ data: GENERIC });
    const user = userEvent.setup();
    renderPage();
    await fileRequest(user, 'nobody@nowhere.test');
    expect(await screen.findByText(/If this account is eligible/i)).toBeTruthy();
  });

  it('rejects an invalid email locally without calling the server', async () => {
    const user = userEvent.setup();
    renderPage();
    await fileRequest(user, 'not-an-email');
    expect(post).not.toHaveBeenCalled();
    expect(screen.getByText(/Enter your registered email/i)).toBeTruthy();
  });

  it('resets with code + new password; secrets only in the POST body, never URL or storage', async () => {
    post.mockResolvedValueOnce({ data: GENERIC }).mockResolvedValueOnce({ data: { success: true, data: null, message: 'ok' } });
    const user = userEvent.setup();
    renderPage();
    await fileRequest(user);
    await screen.findByLabelText('Recovery code');

    await user.type(screen.getByLabelText('Recovery code'), 'abcd-efgh-jklm-npqr');
    await user.type(screen.getByLabelText('New password'), 'Fresh1234');
    await user.type(screen.getByLabelText('Confirm new password'), 'Fresh1234');
    await user.click(screen.getByRole('button', { name: /reset password/i }));

    await screen.findByText(/Password reset/i);
    expect(post).toHaveBeenLastCalledWith('/auth/cashier-recovery/reset', {
      email: 'meena@eggmart.test',
      code: 'ABCD-EFGH-JKLM-NPQR',
      newPassword: 'Fresh1234',
    });
    expect(screen.getByTestId('loc').textContent).toBe('/cashier/forgot-password');
    expect(localStorage.length).toBe(0);
    expect(sessionStorage.length).toBe(0);

    await user.click(screen.getByRole('button', { name: /go to login/i }));
    expect(await screen.findByText('LOGIN PAGE')).toBeTruthy();
  });

  it('blocks a weak password or mismatch locally (code is never submitted)', async () => {
    post.mockResolvedValueOnce({ data: GENERIC });
    const user = userEvent.setup();
    renderPage();
    await fileRequest(user);
    await screen.findByLabelText('Recovery code');
    await user.type(screen.getByLabelText('Recovery code'), 'ABCD-EFGH-JKLM-NPQR');
    await user.type(screen.getByLabelText('New password'), 'short');
    await user.type(screen.getByLabelText('Confirm new password'), 'different');
    await user.click(screen.getByRole('button', { name: /reset password/i }));
    expect(post).toHaveBeenCalledTimes(1); // only the request
    expect(screen.getByText(/at least 8 characters/i, { selector: 'p' })).toBeTruthy();
    expect(screen.getByText(/Passwords don't match/i)).toBeTruthy();
  });

  it('shows one non-revealing message for every verification failure and keeps the form', async () => {
    post.mockResolvedValueOnce({ data: GENERIC }).mockRejectedValueOnce({ kind: 'unknown', code: 'RECOVERY_VERIFICATION_FAILED', message: "We couldn't verify that." });
    const user = userEvent.setup();
    renderPage();
    await fileRequest(user);
    await screen.findByLabelText('Recovery code');
    await user.type(screen.getByLabelText('Recovery code'), 'ABCD-EFGH-JKLM-NPQR');
    await user.type(screen.getByLabelText('New password'), 'Fresh1234');
    await user.type(screen.getByLabelText('Confirm new password'), 'Fresh1234');
    await user.click(screen.getByRole('button', { name: /reset password/i }));
    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toMatch(/couldn't verify that/i);
    expect(screen.getByLabelText('Recovery code').value).toBe('ABCD-EFGH-JKLM-NPQR');
  });

  it('after 15 minutes the form is replaced by "submit a new request"', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    post.mockResolvedValueOnce({ data: GENERIC });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderPage();
    await fileRequest(user);
    await screen.findByLabelText('Recovery code');
    await act(async () => { vi.advanceTimersByTime(15 * 60_000 + 1500); });
    expect(await screen.findByRole('button', { name: /submit a new request/i })).toBeTruthy();
    expect(screen.queryByLabelText('Recovery code')).toBeNull();
    await user.click(screen.getByRole('button', { name: /submit a new request/i }));
    expect(await screen.findByRole('button', { name: /request recovery/i })).toBeTruthy();
  });

  it('"I have a code" skips straight to code entry with no countdown', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByRole('button', { name: /i have a code/i }));
    expect(screen.getByLabelText('Recovery code')).toBeTruthy();
    expect(screen.queryByText(/Expires in about/)).toBeNull();
  });

  it('the old emailed-link route redirects to the new flow', async () => {
    render(
      <MemoryRouter initialEntries={['/cashier/reset-password?token=abc']}>
        <Routes>
          <Route path="/cashier/reset-password" element={<Navigate to="/cashier/forgot-password" replace />} />
          <Route path="/cashier/forgot-password" element={<LocationProbe />} />
        </Routes>
      </MemoryRouter>
    );
    expect((await screen.findByTestId('loc')).textContent).toBe('/cashier/forgot-password');
  });
});
