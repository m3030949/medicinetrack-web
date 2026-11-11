import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { SignupPage } from './SignupPage';

const mockSignup = vi.fn();

vi.mock('./auth-context', () => ({
  useAuth: () => ({
    user: null,
    isLoading: false,
    signup: mockSignup,
  }),
  getDefaultHomeForRole: () => '/pharmacy/dashboard',
}));

describe('SignupPage', () => {
  it('submits new pharmacy organization signup', async () => {
    mockSignup.mockResolvedValueOnce({
      pendingApproval: false,
      accessToken: 'tok',
      user: {
        id: 'u-1',
        role: 'PHARMACY_ADMIN',
      },
    });

    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <SignupPage />
      </MemoryRouter>,
    );

    await user.type(screen.getByLabelText(/full name/i), 'Nishant Sharma');
    await user.type(
      screen.getByLabelText(/work email/i),
      'nishantsuplier@yopmail.com',
    );
    await user.type(
      screen.getByLabelText(/organization name/i),
      'Nishant Pharmacy',
    );
    await user.type(screen.getByLabelText(/^password$/i), 'StrongPass!2026');
    await user.type(
      screen.getByLabelText(/confirm password/i),
      'StrongPass!2026',
    );
    await user.click(
      screen.getByRole('button', { name: /create workspace & sign in/i }),
    );

    await waitFor(() => {
      expect(mockSignup).toHaveBeenCalledWith(
        expect.objectContaining({
          mode: 'NEW_ORGANIZATION',
          email: 'nishantsuplier@yopmail.com',
          organizationType: 'PHARMACY',
          organizationName: 'Nishant Pharmacy',
        }),
      );
    });
  });

  it('shows pending approval state when joining an existing organization', async () => {
    mockSignup.mockResolvedValueOnce({
      pendingApproval: true,
      message: 'Awaiting hospital admin approval.',
      user: {
        id: 'u-2',
        role: 'NURSE',
        status: 'INVITED',
      },
    });

    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <SignupPage />
      </MemoryRouter>,
    );

    await user.click(screen.getByRole('button', { name: /join organization/i }));
    await user.type(screen.getByLabelText(/full name/i), 'Nurse Alex');
    await user.type(screen.getByLabelText(/work email/i), 'alex@hosp.local');
    await user.type(screen.getByLabelText(/organization code/i), 'HOSP-001');
    await user.type(screen.getByLabelText(/^password$/i), 'StrongPass!2026');
    await user.type(
      screen.getByLabelText(/confirm password/i),
      'StrongPass!2026',
    );
    await user.click(
      screen.getByRole('button', { name: /request staff access/i }),
    );

    await waitFor(() => {
      expect(screen.getByText(/registration submitted/i)).toBeInTheDocument();
      expect(
        screen.getByText(/awaiting hospital admin approval/i),
      ).toBeInTheDocument();
    });
  });
});

