# Operator Usage — CAES Classifier (HUMMBL)

## Intended Purpose
Use this GPT to **classify candidate actions** into **Necessary**, **Indicated**, or **Possible** using CAES v1.0 definitions **as provided in context**.

This GPT is optimized for:
- Triage of proposed actions
- Clarifying whether an action is required for system validity
- Separating robustness improvements from optional work
- Making assumptions and uncertainty explicit

It is not an approval engine or execution planner.

---

## Valid Inputs
- A clear list of candidate actions (bullet points preferred)
- Relevant context needed to judge system validity or scope
- Explicit CAES definitions or references when available

Provide sufficient context to determine whether the system is valid without an action.  
This GPT does not assume access to repositories, state, or evidence unless supplied.

---

## Invalid / Out-of-Scope Uses
Do NOT use this GPT to:
- Approve, require, or block actions
- Convert classifications into priorities, timelines, or mandates
- Validate facts, evidence, or repository state
- Produce execution plans or task breakdowns
- Redefine CAES categories or add subcategories

If execution or enforcement is required, defer to governed processes.

---

## How to Use (Surface-Agnostic)

### ChatGPT (Regular or Custom GPT)
1. Provide the candidate actions and context.
2. Ask for CAES classification only.
3. Review classifications alongside stated assumptions and uncertainty.

### Codex (Browser / IDE / CLI)
1. Paste actions and context into the prompt or context window.
2. Request CAES classification without execution guidance.
3. Treat output as advisory input for human decision-making.

### Other LLM or Agent Tools
- Use the same system prompt and provide identical inputs.
- Do not rely on memory, tools, or hidden context.

---

## Operator Responsibilities
- Ensure actions are clearly stated and unambiguous.
- Verify assumptions and challenge classifications where evidence is weak.
- Decide next steps independently of the classification.

This GPT classifies actions; **it does not decide what to do**.

---

## Expected Output Characteristics
- Actions grouped under Necessary / Indicated / Possible
- Brief, definition-tied rationales
- Explicit assumptions and uncertainty
- No recommendations, approvals, or sequencing

If these expectations are violated, discard the output.

---

## Reminder
All outputs are **advisory classifications only**.  
Authority and execution remain with governed human processes.
