// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { apiClient } from '@/api/client';
import { SignupPage } from '@/pages/cashier/SignupPage';
import { PendingApprovalPage } from '@/pages/cashier/PendingApprovalPage';
import { useSignupStore } from '@/store/signupStore';

const BRANCHES = [
  { id: 's1', name: 'Branch One', location: 'One', available: true },
  { id: 's2', name: 'Branch Two', location: 'Two', available: false },
];

function renderFlow() {
  return render(
    <MemoryRouter initialEntries={['/cashier/signup']}>
      <Routes>
        <Route path="/cashier/signup" element={<SignupPage />} />
        <Route path="/cashier/signup/pending" element={<PendingApprovalPage />} />
        <Route path="/cashier/signup/verify" element={<div>OTP PAGE SHOULD NOT EXIST</div>} />
        <Route path="/cashier/login" element={<div>LOGIN</div>} />
      </Routes>
    </MemoryRouter>
  );
}

async function fillForm(user, branchId = 's1') {
  await user.type(screen.getByLabelText(/Full name/i), 'Asha');
  await user.type(screen.getByLabelText(/^Email/i), 'asha@x.co');
  await user.selectOptions(screen.getByLabelText(/^Branch/i), branchId);
  await user.type(screen.getByLabelText(/^Password/i), 'Str0ng!Passw0rd#1');
  await user.type(screen.getByLabelText(/Confirm password/i), 'Str0ng!Passw0rd#1');
}

beforeEach(() => {
  useSignupStore.setState({ invitationVerified: true, verificationToken: 'tok', shopId: '', step: 'account' });
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('Stage 4.1 — signup has no OTP step', () => {
  it('goes straight from Create Account to the pending page and never calls an OTP endpoint', async () => {
    vi.spyOn(apiClient, 'get').mockResolvedValue({ data: BRANCHES });
    const post = vi.spyOn(apiClient, 'post').mockResolvedValue({ data: { requestId: 'r1', email: 'asha@x.co' } });
    const user = userEvent.setup();
    renderFlow();
    await screen.findByRole('option', { name: /Branch One/ });
    await fillForm(user);
    await user.click(screen.getByRole('button', { name: /Create Account/i }));

    expect(await screen.findByText('Request Submitted Successfully')).toBeTruthy();
    expect(screen.queryByText(/OTP PAGE SHOULD NOT EXIST/)).toBeNull();
    expect(screen.queryByText(/email has been verified/i)).toBeNull();
    expect(screen.getByText('Pending approval')).toBeTruthy();
    expect(post.mock.calls.map((c) => c[0])).toEqual(['/auth/signup']);
    expect(useSignupStore.getState().step).toBe('approval');
  });

  it('progress indicator shows Invite, Account, Approval only', async () => {
    vi.spyOn(apiClient, 'get').mockResolvedValue({ data: BRANCHES });
    renderFlow();
    await screen.findByRole('option', { name: /Branch One/ });
    expect(screen.queryByText('Verify')).toBeNull();
    expect(screen.getByText('Invite')).toBeTruthy();
    expect(screen.getByText('Account')).toBeTruthy();
    expect(screen.getByText('Approval')).toBeTruthy();
  });

  it('pending page redirects to signup when no request was submitted', async () => {
    useSignupStore.setState({ requestId: null, step: 'invite' });
    vi.spyOn(apiClient, 'get').mockResolvedValue({ data: BRANCHES });
    render(
      <MemoryRouter initialEntries={['/cashier/signup/pending']}>
        <Routes>
          <Route path="/cashier/signup/pending" element={<PendingApprovalPage />} />
          <Route path="/cashier/signup" element={<div>SIGNUP</div>} />
        </Routes>
      </MemoryRouter>
    );
    expect(await screen.findByText('SIGNUP')).toBeTruthy();
  });
});

describe('Stage 4.1 — branch conflict handling', () => {
  it('BRANCH_HAS_CASHIER: shows message, clears selection, refetches branches, keeps other fields, no navigation', async () => {
    const get = vi
      .spyOn(apiClient, 'get')
      .mockResolvedValueOnce({ data: BRANCHES })
      .mockResolvedValueOnce({
        data: [
          { id: 's1', name: 'Branch One', location: 'One', available: false },
          { id: 's3', name: 'Branch Three', location: 'Three', available: true },
        ],
      });
    vi.spyOn(apiClient, 'post').mockRejectedValue({
      kind: 'unknown',
      code: 'BRANCH_HAS_CASHIER',
      message: 'This branch already has a cashier.',
    });
    const user = userEvent.setup();
    renderFlow();
    await screen.findByRole('option', { name: /Branch One/ });
    await fillForm(user);
    await user.click(screen.getByRole('button', { name: /Create Account/i }));

    expect(await screen.findByText('That branch already has a cashier. Please choose another branch.')).toBeTruthy();
    await waitFor(() => expect(get).toHaveBeenCalledTimes(2));
    const refreshed = await screen.findByRole('option', { name: /Branch Three/ });
    expect(refreshed.disabled).toBe(false);
    expect(screen.getByRole('option', { name: /Branch One/ }).disabled).toBe(true);
    expect(screen.getByLabelText(/^Branch/i).value).toBe('');
    expect(useSignupStore.getState().shopId).toBe('');
    expect(screen.getByLabelText(/Full name/i).value).toBe('Asha');
    expect(screen.getByLabelText(/^Email/i).value).toBe('asha@x.co');
    expect(screen.queryByText('Request Submitted Successfully')).toBeNull();
  });

  it('BRANCH_NOT_FOUND: shows a distinct message, clears selection and refetches', async () => {
    const get = vi.spyOn(apiClient, 'get').mockResolvedValue({ data: BRANCHES });
    vi.spyOn(apiClient, 'post').mockRejectedValue({ kind: 'not_found', code: 'BRANCH_NOT_FOUND', message: 'nope' });
    const user = userEvent.setup();
    renderFlow();
    await screen.findByRole('option', { name: /Branch One/ });
    await fillForm(user);
    await user.click(screen.getByRole('button', { name: /Create Account/i }));
    expect(await screen.findByText('That branch is no longer available. Please choose another branch.')).toBeTruthy();
    await waitFor(() => expect(get).toHaveBeenCalledTimes(2));
    expect(useSignupStore.getState().shopId).toBe('');
  });

  it('other errors keep the selection, show the server message and do not refetch', async () => {
    const get = vi.spyOn(apiClient, 'get').mockResolvedValue({ data: BRANCHES });
    vi.spyOn(apiClient, 'post').mockRejectedValue({ kind: 'server', code: 'X', message: 'Server error. Please try again.' });
    const user = userEvent.setup();
    renderFlow();
    await screen.findByRole('option', { name: /Branch One/ });
    await fillForm(user);
    await user.click(screen.getByRole('button', { name: /Create Account/i }));
    expect(await screen.findByText('Server error. Please try again.')).toBeTruthy();
    expect(get).toHaveBeenCalledTimes(1);
    expect(useSignupStore.getState().shopId).toBe('s1');
  });
});

describe('Stage 4.1 — branch list states', () => {
  it('Retry reloads branches after a load failure', async () => {
    const get = vi
      .spyOn(apiClient, 'get')
      .mockRejectedValueOnce({ kind: 'network', message: 'Network error.' })
      .mockResolvedValueOnce({ data: BRANCHES });
    const user = userEvent.setup();
    renderFlow();
    expect(await screen.findByText(/Couldn't load branches/)).toBeTruthy();
    expect(screen.getByLabelText(/^Branch/i).disabled).toBe(true);
    await user.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByRole('option', { name: /Branch One/ })).toBeTruthy();
    expect(get).toHaveBeenCalledTimes(2);
    expect(screen.queryByText(/Couldn't load branches/)).toBeNull();
  });

  it('shows a message when the backend returns no branches', async () => {
    vi.spyOn(apiClient, 'get').mockResolvedValue({ data: [] });
    renderFlow();
    expect(await screen.findByText(/No branches have been set up yet/)).toBeTruthy();
  });

  it('shows a message when every branch already has a cashier', async () => {
    vi.spyOn(apiClient, 'get').mockResolvedValue({
      data: [{ id: 's2', name: 'Branch Two', location: 'Two', available: false }],
    });
    renderFlow();
    expect(await screen.findByText(/Every branch already has a cashier/)).toBeTruthy();
  });
});
