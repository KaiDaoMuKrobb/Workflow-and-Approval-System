// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import ReviewerQueue, { QueueRequest } from '../../src/components/ReviewerQueue';

/**
 * F-03 — AC-28, the empty state.
 *
 * The queue is a presentational component so this can assert what a reviewer
 * actually sees without simulating a network response. Both directions are
 * covered: an empty result must show the message and no rows, and a non-empty
 * result must show the rows and not the message.
 */
describe('Feature F-03: Reviewer dashboard empty state (AC-28)', () => {
  afterEach(cleanup);

  const sample: QueueRequest = {
    id: 'req-1',
    requestNumber: 'EXP-2026-0001',
    title: 'Client visit travel, October',
    totalAmount: '1500.00',
    status: 'SUBMITTED',
    createdAt: '2026-11-03T10:00:00.000Z',
    requester: { id: 'user-1', name: 'Alice Requester', department: 'Engineering' },
  };

  it('TEST-28 / AC-28: an empty queue shows the message and renders no rows', () => {
    render(<ReviewerQueue requests={[]} />);

    expect(screen.getByText('No requests are waiting for your review')).toBeDefined();
    expect(screen.queryAllByTestId('reviewer-queue-row')).toHaveLength(0);
    // Not an empty table either — there should be no table at all.
    expect(screen.queryByRole('table')).toBeNull();
  });

  it('TEST-28b: a non-empty queue shows the rows and not the empty message', () => {
    render(<ReviewerQueue requests={[sample]} />);

    expect(screen.queryByText('No requests are waiting for your review')).toBeNull();
    expect(screen.queryAllByTestId('reviewer-queue-row')).toHaveLength(1);
    expect(screen.getByText('Client visit travel, October')).toBeDefined();
    expect(screen.getByText('Alice Requester')).toBeDefined();
  });

  it('TEST-28c: the total is rendered exactly as the API sends it (DEC-04)', () => {
    render(<ReviewerQueue requests={[{ ...sample, totalAmount: '1270.50' }]} />);

    // Rendered from the string, so a trailing zero survives. Parsing it into a
    // number would print "1270.5" and quietly lose the cents column.
    expect(screen.getByText('1270.50')).toBeDefined();
  });
});
