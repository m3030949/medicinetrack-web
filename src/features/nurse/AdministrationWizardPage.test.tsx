import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { AdministrationWizardPage } from './AdministrationWizardPage';

const mockPost = vi.fn().mockResolvedValue({ data: { status: 'OUTER_SCANNED' } });

vi.mock('@/lib/api-client', () => ({
  apiClient: {
    get: vi.fn().mockResolvedValue({
      data: {
        id: 'sess-1',
        status: 'INITIATED',
        startedAt: '2026-11-11T10:00:00.000Z',
        expiresAt: '2026-11-11T10:30:00.000Z',
        completedAt: null,
        hospital: { id: 'h-1', code: 'HOSP-001', name: 'St. Jude Hospital' },
        nurse: { id: 'n-1', fullName: 'Sarah Jenkins, RN', employeeCode: 'RN-1' },
        patient: null,
        package: null,
        clinicalVerification: null,
        administration: null,
      },
    }),
    post: (...args: unknown[]) => mockPost(...args),
  },
  extractApiError: () => 'error',
}));

describe('AdministrationWizardPage', () => {
  it('displays 5-step progress indicator and submits manual outside QR token', async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const user = userEvent.setup();

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/nurse/administer/sess-1']}>
          <Routes>
            <Route
              path="/nurse/administer/:sessionId"
              element={<AdministrationWizardPage />}
            />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(
      await screen.findByText('Scan Outside Medicine QR'),
    ).toBeInTheDocument();
    expect(screen.getByText('1. Outside QR')).toBeInTheDocument();
    expect(screen.getByText('5. Administration Confirmation')).toBeInTheDocument();

    const input = screen.getByPlaceholderText(/paste or type qr token/i);
    await user.type(input, 'MT1:OUT:1234567890ABCDEF');
    await user.click(screen.getByRole('button', { name: /verify qr token/i }));

    await waitFor(() => {
      expect(mockPost).toHaveBeenCalledWith(
        '/administrations/sess-1/scan-outer',
        { token: 'MT1:OUT:1234567890ABCDEF' },
      );
    });
  });
});

