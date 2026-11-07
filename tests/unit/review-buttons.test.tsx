// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import ReviewDecisionPanel, { ReviewTarget } from '../../src/components/ReviewDecisionPanel';

/**
 * F-04 — AC-39, the decision controls.
 *
 * The panel is presentational about the decision of whether to offer the
 * controls, so each case in section 3.3 of the contract can be asserted without
 * a network response. Hiding a button is not authorization — every one of these
 * cases is also refused by the API, and those refusals are in
 * tests/api/review-guards.test.ts. This file only proves the page does not
 * invite a click that would be refused.
 */
describe('Feature F-04: Decision controls on the detail page (AC-39)', () => {
  afterEach(cleanup);

  const CAROL = 'user-carol';
  const ALICE = 'user-alice';
  const DAVID = 'user-david';

  const submittedToCarol: ReviewTarget = {
    id: 'req-1',
    status: 'SUBMITTED',
    requesterId: ALICE,
    assignedReviewerId: CAROL,
  };

  it('TEST-39 / AC-39: an already approved request offers no controls', () => {
    render(
      <ReviewDecisionPanel
        request={{ ...submittedToCarol, status: 'APPROVED' }}
        viewerId={CAROL}
      />
    );

    expect(screen.queryByTestId('review-decision-panel')).toBeNull();
    expect(screen.queryByRole('button', { name: /approve/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /reject/i })).toBeNull();
  });

  it('TEST-39b: the assigned reviewer of a SUBMITTED request gets a comment field and both buttons', () => {
    // The success case. Without it, a panel that renders nothing at all would
    // pass every other test in this file.
    render(<ReviewDecisionPanel request={submittedToCarol} viewerId={CAROL} />);

    expect(screen.getByTestId('review-decision-panel')).toBeDefined();
    expect(screen.getByRole('button', { name: /approve/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /reject/i })).toBeDefined();
    expect(screen.getByTestId('review-comment')).toBeDefined();
  });

  it('TEST-39c (BR-01): the person who raised the request gets no controls, even as the assigned reviewer', () => {
    render(
      <ReviewDecisionPanel
        request={{ ...submittedToCarol, requesterId: DAVID, assignedReviewerId: DAVID }}
        viewerId={DAVID}
      />
    );

    expect(screen.queryByTestId('review-decision-panel')).toBeNull();
  });

  it('TEST-39d (BR-05): a reviewer who is not the assigned one gets no controls', () => {
    render(<ReviewDecisionPanel request={submittedToCarol} viewerId={DAVID} />);

    expect(screen.queryByTestId('review-decision-panel')).toBeNull();
  });

  it('TEST-39e (BR-02): a REJECTED request offers no controls either', () => {
    // AC-39 names APPROVED. REJECTED is the other terminal state and must behave
    // the same way, or a rejected request could be reopened from the screen.
    render(
      <ReviewDecisionPanel
        request={{ ...submittedToCarol, status: 'REJECTED' }}
        viewerId={CAROL}
      />
    );

    expect(screen.queryByTestId('review-decision-panel')).toBeNull();
  });

  it('TEST-39f: a DRAFT request offers no controls to its assigned reviewer', () => {
    render(
      <ReviewDecisionPanel
        request={{ ...submittedToCarol, status: 'DRAFT' }}
        viewerId={CAROL}
      />
    );

    expect(screen.queryByTestId('review-decision-panel')).toBeNull();
  });

  it('TEST-39g: before the session is known, no controls are offered', () => {
    // The page learns who is viewing from /api/auth/me, which resolves after the
    // first paint. Offering the buttons in the meantime would flash a control at
    // a viewer who may not be allowed to use it.
    render(<ReviewDecisionPanel request={submittedToCarol} viewerId={null} />);

    expect(screen.queryByTestId('review-decision-panel')).toBeNull();
  });
});
