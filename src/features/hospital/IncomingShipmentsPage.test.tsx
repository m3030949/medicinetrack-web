import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { IncomingShipmentsPage } from './IncomingShipmentsPage';

const mockPost = vi.fn().mockResolvedValue({
  data: { summary: { received: 1, remainingPending: 0 } },
});

vi.mock('@/lib/api-client', () => ({
  apiClient: {
    get: vi.fn((url: string) => {
      if (url === '/shipments') {
        return Promise.resolve({
          data: {
            items: [
              {
                id: 'shp-1',
                shipmentReference: 'SHP-000001',
                status: 'DISPATCHED',
                dispatchedAt: '2026-11-11T10:00:00.000Z',
                pharmacy: { code: 'PHARM-001', name: 'Metro Pharmacy' },
                counts: {
                  total: 1,
                  pending: 1,
                  received: 0,
                  missing: 0,
                  damaged: 0,
                  rejected: 0,
                },
              },
            ],
          },
        });
      }
      return Promise.resolve({
        data: {
          id: 'shp-1',
          shipmentReference: 'SHP-000001',
          status: 'DISPATCHED',
          pharmacy: { code: 'PHARM-001', name: 'Metro Pharmacy' },
          items: [
            {
              id: 'si-1',
              packageId: 'pkg-1',
              receiptStatus: 'PENDING',
              notes: null,
              package: {
                id: 'pkg-1',
                packageSerial: 'PKG-000001',
                medicine: { medicineName: 'Epinephrine', strength: '1mg/mL' },
                batch: {
                  batchNumber: 'BATCH-1',
                  expiryDate: '2028-12-31T00:00:00.000Z',
                  status: 'ACTIVE',
                },
                qrCodes: [{ qrType: 'OUTER', displayCode: 'OUT-8F29X1' }],
              },
            },
          ],
        },
      });
    }),
    post: (...args: unknown[]) => mockPost(...args),
  },
  extractApiError: () => 'error',
}));

describe('IncomingShipmentsPage', () => {
  it('requires explicit per-package verification decision before accepting shipment', async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const user = userEvent.setup();

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <IncomingShipmentsPage />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    const verifyBtn = await screen.findByRole('button', {
      name: /verify & receive/i,
    });
    await user.click(verifyBtn);

    const select = await screen.findByLabelText(/decision for PKG-000001/i);
    expect(select).toHaveValue('');

    await user.selectOptions(select, 'RECEIVED');
    await user.click(
      screen.getByRole('button', { name: /confirm verified items/i }),
    );

    await waitFor(() => {
      expect(mockPost).toHaveBeenCalledWith('/shipments/shp-1/receive', {
        items: [{ packageId: 'pkg-1', decision: 'RECEIVED', notes: undefined }],
      });
    });
  });
});

