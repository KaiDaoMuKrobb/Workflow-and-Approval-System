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
