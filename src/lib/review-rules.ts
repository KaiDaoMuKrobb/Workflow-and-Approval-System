/**
 * The decision rule `FR-05` states, in one place.
 *
 * `FR-05` in `docs/srs.md`: a reviewer approves or rejects *"with a mandatory
 * comment"* — both decisions, not only rejection. The length is fixed in `F-04`
 * contract §3.2.
 *
 * The endpoint enforces it and the panel repeats it so the reviewer is told
 * before a round trip rather than after one. Two enforcement points mean two
 * chances to drift, so the number and the sentence live here and neither side
 * writes its own.
 */
export const MIN_DECISION_COMMENT_LENGTH = 5;

export const DECISION_COMMENT_REQUIRED_MESSAGE =
  `A reason of at least ${MIN_DECISION_COMMENT_LENGTH} characters is required to decide a request`;

/**
 * Single line item upper boundary constraint (Handout §3.5 Controlled Defect Exercise).
 * Individual line items cannot exceed 100,000.00 THB under anti-fraud corporate governance.
 */
export const MAX_SINGLE_ITEM_AMOUNT = 100000;

/**
 * The return rule `BR-07`, stated in one place like the decision rule above.
 *
 * `BR-07` in `docs/srs.md`: returning a claim for revision requires a non-empty
 * reason of at least 10 characters. This is a separate and higher threshold
 * from `MIN_DECISION_COMMENT_LENGTH`, which governs approve and reject and does
 * not change. A returned claim asks the requester to do work, so the reason has
 * to say what needs changing, and five characters cannot. The number is fixed
 * by the `F-05` contract, section 2.1.
 */
export const MIN_RETURN_COMMENT_LENGTH = 10;

export const RETURN_COMMENT_REQUIRED_MESSAGE =
  `A reason of at least ${MIN_RETURN_COMMENT_LENGTH} characters is required to return a request for revision`;

export const SINGLE_ITEM_CAP_MESSAGE =
  'Single item amount cannot exceed 100,000 THB.';

/**
 * Supported expense categories across line items and filtering (F-07 / FR-08).
 */
export const VALID_EXPENSE_CATEGORIES = [
  'TRAVEL',
  'MEALS',
  'SUPPLIES',
  'EQUIPMENT',
  'OFFICE_SUPPLIES',
  'OTHER',
] as const;

export type ValidExpenseCategory = (typeof VALID_EXPENSE_CATEGORIES)[number];


