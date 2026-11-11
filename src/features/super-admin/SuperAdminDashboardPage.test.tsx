import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SuperAdminDashboardPage } from './SuperAdminDashboardPage';

vi.mock('@/lib/api-client', () => ({
  apiClient: {
    get: vi.fn().mockResolvedValue({
      data: {
        generatedAt: '2026-11-11T12:00:00.000Z',
        organizationsSummary: [{ type: 'HOSPITAL', status: 'ACTIVE', count: 2 }],
        usersSummary: [{ role: 'NURSE', status: 'ACTIVE', count: 5 }],
        batchesSummary: [],
        packagesSummary: [{ status: 'AVAILABLE', count: 14 }],
        shipmentsSummary: [],
        administrationsSummary: [{ status: 'ADMINISTERED', count: 8 }],
        auditEventsCount: 42,
        organizations: [
          {
            id: 'org-1',
            code: 'HOSP-001',
            name: 'St. Jude General Hospital',
            type: 'HOSPITAL',
            status: 'ACTIVE',
            _count: {
              users: 4,
              medicines: 0,
              outgoingShipments: 0,
              incomingShipments: 2,
              administrations: 8,
            },
          },
        ],
      },
    }),
  },
}));

describe('SuperAdminDashboardPage', () => {
  it('displays organization statistics and audit totals', async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <SuperAdminDashboardPage />
      </QueryClientProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText('St. Jude General Hospital')).toBeInTheDocument();
      expect(screen.getByText(/42 immutable audit events/i)).toBeInTheDocument();
    });
  });
});

