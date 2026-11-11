import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import {
  WebSale,
  amountLabel,
  methodLabel,
  needsReview,
  saleState,
  timeAgo,
} from '../lib/admin/webSales';

const base: WebSale = {
  id: '11111111-2222-3333-4444-555555555555',
  order_number: 'TK-202611-00015',
  created_at: new Date().toISOString(),
  status: 'paid',
  payment_method: 'card',
  payment_status: 'validated',
  total: 160,
  first_name: 'Ana',
  last_name: 'Gómez',
  payment_details: { installments: 3, amount_ars: 276320, card_brand: 'Visa', last_four: '4905', status: 'approved' },
};

describe('cómo se muestra cada venta en el admin', () => {
  it('tarjeta: cuotas, marca, últimos 4 y pesos cobrados', () => {
    expect(methodLabel(base)).toBe('Tarjeta · 3 cuotas · Visa •••• 4905');
    expect(amountLabel(base)).toMatch(/276\.320/);
    expect(saleState(base)).toEqual({ label: 'Cobrada', tone: 'green' });
  });

  it('1 pago y transferencia', () => {
    expect(methodLabel({ ...base, payment_details: { ...base.payment_details, installments: 1 } })).toBe('Tarjeta · 1 pago · Visa •••• 4905');
    const transfer = { ...base, payment_method: 'crypto_transfer', status: 'draft' as const, payment_status: 'pending', payment_details: null };
    expect(methodLabel(transfer)).toBe('Transferencia / cripto');
    expect(amountLabel(transfer)).toBe('US$ 160');
    expect(saleState(transfer).label).toBe('Esperando el pago');
  });

  it('un cobro que Payway no confirmó pide revisión; uno en curso, no', () => {
    const unknown = { ...base, status: 'draft' as const, payment_details: { ...base.payment_details, status: 'unknown' } };
    expect(needsReview(unknown)).toBe(true);
    expect(saleState(unknown).label).toBe('Cobro sin confirmar');
    const inProgress = { ...base, status: 'draft' as const, payment_details: { ...base.payment_details, status: 'processing' } };
    expect(needsReview(inProgress)).toBe(false);
    const stuck = { ...inProgress, created_at: new Date(Date.now() - 5 * 60 * 1000).toISOString() };
    expect(needsReview(stuck)).toBe(true);
    expect(needsReview(base)).toBe(false);
  });

  it('hace cuánto', () => {
    const now = Date.parse('2026-11-11T12:00:00Z');
    expect(timeAgo('2026-11-11T11:59:40Z', now)).toBe('recién');
    expect(timeAgo('2026-11-11T11:45:00Z', now)).toBe('hace 15 min');
    expect(timeAgo('2026-11-11T09:00:00Z', now)).toBe('hace 3 h');
    expect(timeAgo('2026-11-10T09:00:00Z', now)).toBe('ayer');
  });
});

// ── Campanita con una base simulada ──
let rows: WebSale[] = [];
vi.mock('@/lib/supabase/client', () => ({
  createBrowserClient: () => {
    const q: any = {
      select: () => q,
      gt: () => q,
      order: () => q,
      limit: () => Promise.resolve({ data: rows, error: null }),
    };
    return { from: () => q };
  },
}));
vi.mock('next/link', () => ({ default: ({ children, href, ...p }: any) => <a href={href} {...p}>{children}</a> }));

describe('campanita de ventas nuevas', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();
    rows = [];
  });
  afterEach(() => vi.useRealTimers());

  it('cuenta las nuevas, avisa la que entra con el panel abierto y se limpia al verlas', async () => {
    const { SalesBell } = await import('../components/admin/SalesBell');
    const older = { ...base, id: 'a', order_number: 'TK-1', created_at: new Date(Date.now() - 60 * 60 * 1000).toISOString() };
    rows = [older];
    render(<SalesBell />);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10);
    });
    // La que ya estaba esperando cuenta, pero no salta el cartel
    expect(screen.getByLabelText('1 ventas nuevas')).toBeTruthy();
    expect(screen.queryByRole('status')).toBeNull();
    expect(document.title).toMatch(/^\(1\)/);

    // Entra una venta con tarjeta mientras el panel está abierto
    rows = [{ ...base, id: 'b', order_number: 'TK-2' }, older];
    await act(async () => {
      await vi.advanceTimersByTimeAsync(30_000);
    });
    expect(screen.getByLabelText('2 ventas nuevas')).toBeTruthy();
    const toast = screen.getByRole('status');
    expect(toast.textContent).toContain('Nueva venta con tarjeta');
    expect(toast.textContent).toContain('3 cuotas');

    // El mismo pedido no vuelve a avisar en la próxima vuelta
    fireEvent.click(screen.getByLabelText('Cerrar aviso'));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(30_000);
    });
    expect(screen.queryByRole('status')).toBeNull();

    // Abrir y cerrar la lista las marca como vistas
    fireEvent.click(screen.getByLabelText('2 ventas nuevas'));
    expect(screen.getByText(/TK-2 · Ana Gómez · hace 1 min/)).toBeTruthy();
    fireEvent.click(screen.getByLabelText('2 ventas nuevas'));
    expect(localStorage.getItem('tk-admin-ventas-vistas')).toBe(rows[0].created_at);
    expect(screen.getByLabelText('Ventas nuevas')).toBeTruthy();
  });
});
