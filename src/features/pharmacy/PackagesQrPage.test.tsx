import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { PackagesQrPage } from './PackagesQrPage';

vi.mock('@/lib/api-client', () => ({
  apiClient: {
    get: vi.fn((url: string) => {
      if (url.includes('/pharmacy/batches')) {
        return Promise.resolve({
          data: {
            items: [
              {
                id: 'b-1',
                batchNumber: 'BATCH-2026-001',
                quantity: 50,
                status: 'ACTIVE',
                medicine: { medicineName: 'Epinephrine', strength: '1mg/mL' },
                _count: { packages: 1 },
              },
            ],
          },
        });
      }
      return Promise.resolve({
        data: {
          items: [
            {
              id: 'pkg-1',
              packageSerial: 'PKG-000001',
              status: 'CREATED',
              medicine: { medicineName: 'Epinephrine', strength: '1mg/mL' },
              batch: {
                id: 'b-1',
                batchNumber: 'BATCH-2026-001',
                expiryDate: '2028-12-31T00:00:00.000Z',
                status: 'ACTIVE',
              },
              qrCodes: [
                {
                  id: 'qr-1',
                  qrType: 'OUTER',
                  displayCode: 'OUT-8F29X1',
                  status: 'ACTIVE',
                  reprintCount: 0,
                  lastPrintedAt: null,
                },
                {
                  id: 'qr-2',
                  qrType: 'INNER',
                  displayCode: 'IN-7B31K9',
                  status: 'ACTIVE',
                  reprintCount: 0,
                  lastPrintedAt: null,
                },
              ],
            },
          ],
        },
      });
    }),
    post: vi.fn(),
    request: vi.fn(),
  },
  extractApiError: () => 'error',
}));

describe('PackagesQrPage', () => {
  it('renders generated physical packages with both OUTER and INNER QR display codes', async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <PackagesQrPage />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText('PKG-000001')).toBeInTheDocument();
      expect(screen.getByText('OUT-8F29X1')).toBeInTheDocument();
      expect(screen.getByText('IN-7B31K9')).toBeInTheDocument();
    });
  });
});

