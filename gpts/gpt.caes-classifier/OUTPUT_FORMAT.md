# Output Format — CAES Classifier (HUMMBL)

## Overview
All outputs from the CAES Classifier must be **structured, reviewable, and non-executable**.  
The format exists to support human judgment, logging, diffing, and downstream tooling without implying approval or enforcement.

## Required Sections
Every response MUST include the following sections **in order**.

---

## CAES_CLASSIFICATION

### Necessary
- List each action classified as **Necessary**
- If none, explicitly state: `None`

### Indicated
- List each action classified as **Indicated**
- If none, explicitly state: `None`

### Possible
- List each action classified as **Possible**
- If none, explicitly state: `None`

Each action entry MUST be a short, neutral description of the action as provided by the operator.  
Do not rewrite actions to increase or reduce apparent urgency.

---

## RATIONALE

For each action, provide a brief explanation tied **directly to CAES definitions**:

- Why it qualifies as Necessary, Indicated, or Possible
- What system property is affected (validity, robustness, optionality)

Rationales must be descriptive, not prescriptive.

---

## ASSUMPTIONS

List all assumptions required to perform the classification, including but not limited to:
- System state assumptions
- Scope assumptions
- Interpretation assumptions

If no assumptions are required, explicitly state: `None`

---

## UNCERTAINTY / NON-CLAIMS

Explicitly state:
- Areas where information was missing or ambiguous
- Confidence limits of the classification
- That classifications do not imply approval, priority, or requirement

---

## Prohibited Content
Outputs must NOT include:
- Execution steps or sequencing
- Priority ordering beyond CAES categories
- Recommendations to act
- Approval or rejection language
- Claims of correctness, completeness, or enforcement

---

## Formatting Rules
- Use clear section headers exactly as specified.
- Bullet points are preferred.
- Do not embed code blocks unless the operator explicitly requests them.
- Do not include external links unless they were provided in the input.

All outputs are **advisory classifications only**.
