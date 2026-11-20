import { describe, it, expect } from 'vitest';
import { validateItemAmount, MAX_SINGLE_ITEM_AMOUNT } from '../../src/lib/review-rules';

/**
 * Controlled Defect Exercise per Lab 6 Handout Section 3.5.
 * Defect ID: DEF-CONTROLLED-BOUNDARY-01
 * Requirement: Single line item amount cannot exceed 100,000.00 THB (Anti-fraud financial governance boundary).
 */
describe('DEF-CONTROLLED-01: Line Item Upper Boundary Validation (Handout §3.5)', () => {
  it('TEST-RED: rejects amounts exceeding 100,000 THB with explicit policy validation error', () => {
    expect(MAX_SINGLE_ITEM_AMOUNT).toBe(100000);
    const result = validateItemAmount(150000);
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Single item amount cannot exceed 100,000 THB.');
  });

  it('TEST-BOUNDARY: accepts boundary value of exactly 100,000 THB', () => {
    const result = validateItemAmount(100000);
    expect(result.valid).toBe(true);
  });

  it('TEST-NORMAL: accepts valid amounts strictly greater than zero and under limit', () => {
    const result = validateItemAmount(850.50);
    expect(result.valid).toBe(true);
  });

  it('TEST-INVALID: rejects negative or zero amounts', () => {
    expect(validateItemAmount(0).valid).toBe(false);
    expect(validateItemAmount(-50).valid).toBe(false);
  });
});
