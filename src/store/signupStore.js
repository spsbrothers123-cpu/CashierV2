import { create } from 'zustand';

/**
 * Carries state across the multi-step signup flow
 * (Invite Code -> Account -> Verify -> Approval) so each step is its own
 * route (deep-linkable, back-button friendly) without re-collecting data
 * the cashier already entered.
 *
 * This is in-memory only (cleared on full page reload) — that's intentional:
 * an in-progress signup with a live OTP request shouldn't silently survive a
 * refresh days later. Each page guards against missing state by redirecting
 * back to /cashier/signup (see SignupProgress usage in the pages themselves).
 */
export const useSignupStore = create((set) => ({
  invitationVerified: false,
  verificationToken: null,
  requestId: null,
  name: '',
  email: '',
  branchName: '',
  step: 'invite', // 'invite' | 'account' | 'verify' | 'approval'

  markInvitationVerified: ({ verificationToken }) =>
    set({ invitationVerified: true, verificationToken, step: 'account' }),

  setBranchName: (branchName) => set({ branchName }),

  startSignupRequest: ({ requestId, name, email }) =>
    set({ requestId, name, email, step: 'verify' }),

  markVerified: () => set({ step: 'approval' }),

  reset: () =>
    set({
      invitationVerified: false,
      verificationToken: null,
      requestId: null,
      name: '',
      email: '',
      branchName: '',
      step: 'invite',
    }),
}));
