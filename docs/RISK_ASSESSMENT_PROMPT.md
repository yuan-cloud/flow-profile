# RISK_ASSESSMENT_PROMPT.md

Use this prompt after each milestone to prevent accidental technical debt.

## Prompt

ASSUMPTION CHECK
- What unstated premises did we build on.
- Which premises are not verified.

COUNTER-ARGUMENT
- What would a skeptical engineer disagree with.
- What alternative design would they suggest.

RISK SCENARIO
- What could go wrong in production usage.
- How we would detect it.
- What the blast radius is.

QUESTIONS TO RECONSIDER
- What should we verify next.
- Which edge cases are most likely.

TECH DEBT FLAGS
- Which decisions might be expensive to reverse.
- What we can do now to keep options open.

ROLLBACK PLAN
- What can be removed without breaking the core product.
