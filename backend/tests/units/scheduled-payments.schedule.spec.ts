import { computeNextExecutionAt } from '../../src/scheduled-payments/scheduled-payments.service';

describe('computeNextExecutionAt', () => {
  it('does not create a follow-up for one-time payments', () => {
    expect(
      computeNextExecutionAt(new Date('2026-09-16T00:00:00.000Z'), 'ONCE'),
    ).toBeNull();
  });

  it('advances weekly payments by seven UTC calendar days', () => {
    const next = computeNextExecutionAt(
      new Date('2026-09-16T14:45:00.000Z'),
      'WEEKLY',
    );
    expect(next?.toISOString()).toBe('2026-09-23T14:45:00.000Z');
  });

  it('advances monthly payments on the same UTC calendar day and time', () => {
    const next = computeNextExecutionAt(
      new Date('2026-09-16T14:45:00.000Z'),
      'MONTHLY',
    );
    expect(next?.toISOString()).toBe('2026-10-16T14:45:00.000Z');
  });

  it('clamps month-end dates instead of overflowing into the following month', () => {
    const next = computeNextExecutionAt(
      new Date('2026-01-31T00:00:00.000Z'),
      'MONTHLY',
    );
    expect(next?.toISOString()).toBe('2026-02-28T00:00:00.000Z');
  });
});
