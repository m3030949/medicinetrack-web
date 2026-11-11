import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { PatientsPage } from './PatientsPage';

vi.mock('@/features/auth/auth-context', () => ({
  useAuth: () => ({
    user: { id: 'ha-1', role: 'HOSPITAL_ADMIN', fullName: 'Admin' },
  }),
}));

vi.mock('@/lib/api-client', () => ({
  apiClient: {
    get: vi.fn().mockResolvedValue({
      data: {
        items: [
          {
            id: 'pat-1',
            patientNumber: 'PAT-2026-001',
            patientName: 'Alice Smith',
            status: 'ACTIVE',
            createdAt: '2026-11-11T10:00:00.000Z',
            creator: { fullName: 'Sarah RN', role: 'NURSE' },
            _count: { prescriptions: 1, administrations: 0 },
          },
        ],
      },
    }),
    post: vi.fn(),
    patch: vi.fn(),
  },
  extractApiError: () => 'error',
}));

describe('PatientsPage', () => {
  it('renders hospital-scoped patients without external HIS fields', async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <PatientsPage />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText('PAT-2026-001')).toBeInTheDocument();
      expect(screen.getByText('Alice Smith')).toBeInTheDocument();
    });
  });
});

