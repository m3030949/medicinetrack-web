import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { LoginPage } from './LoginPage';

const mockLogin = vi.fn();
const mockVerifyMfa = vi.fn();

vi.mock('./auth-context', () => ({
  useAuth: () => ({
    user: null,
    isLoading: false,
    login: mockLogin,
    verifyMfa: mockVerifyMfa,
  }),
  getDefaultHomeForRole: () => '/nurse/dashboard',
}));

describe('LoginPage', () => {
  it('validates email/password and transitions to MFA challenge when required', async () => {
    mockLogin.mockResolvedValueOnce({
      mfaRequired: true,
      challengeToken: 'challenge-token-xyz',
    });

    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>,
    );

    await user.type(screen.getByLabelText(/work email/i), 'admin@hospital.org');
    await user.type(screen.getByLabelText(/password/i), 'StrongPass!2026');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith(
        'admin@hospital.org',
        'StrongPass!2026',
      );
      expect(
        screen.getByLabelText(/totp or recovery code/i),
      ).toBeInTheDocument();
    });
  });
});

