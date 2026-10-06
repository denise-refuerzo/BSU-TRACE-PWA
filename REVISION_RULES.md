# Capstone Paper Revision Rules

These rules are the source of truth for revising the capstone paper in this project.

## 1. Working DOCX

- The `.docx` capstone paper located in the project/source folder is a downloaded working copy of the paper.
- It may be directly edited in place when revisions are requested.
- Do not create a new copy for every revision unless specifically requested.
- The shared/original version is stored separately in OneDrive; the `.docx` in this project folder is meant to be edited.

## 2. Highlight All Changes

- Whenever editing the working `.docx`, highlight every piece of text that is added or changed.
- Text that was not changed should remain unhighlighted.
- Highlight changes to in-text citations and reference-list entries as well.
- Highlights are used to identify what changed, what needs to be transferred to the shared/original paper, and what may need double-checking.

## 3. Actual System as Technical Source of Truth

- The capstone paper may be outdated compared with the actual system.
- The system has changed based on professors' suggestions.
- Do not assume implementation details in the paper still match the current system.
- For implementation-specific information, treat the current Codex project/codebase as the source of truth.

## 4. Tell the User What to Ask Codex

- When a technical section cannot be confidently verified from the paper alone, do not guess or invent details.
- Tell the user exactly what needs to be verified from the Codex project.
- Provide a specific, copy-paste-ready prompt the user can send to Codex.
- The prompt should instruct Codex to inspect the actual current codebase, not rely on outdated documentation.
- Ask Codex for evidence when appropriate, including current technologies/frameworks, architecture, database structure, algorithms, APIs, authentication/security mechanisms, modules, features, workflows, relevant files/classes/functions, and implementation details.

Technical revision workflow:

```text
Paper -> identify potentially outdated technical claim -> ask user to verify it with Codex -> user provides Codex findings -> revise the working .docx -> highlight the revision.
```

## 5. References and Citations

- If a revision introduces information that requires support from literature, add an appropriate in-text citation and reference-list entry.
- If an existing reference already supports the revised statement, use that existing reference.
- Highlight any new or modified citation/reference in the working `.docx`.
- Do not fabricate references, authors, titles, DOIs, findings, or publication information.

## 6. Date Requirement for New Sources

- Any new external source introduced must have been published from 2021 through 2026.
- Prefer credible academic or authoritative sources, such as peer-reviewed journal articles, conference papers, academic publications, official technical documentation, and authoritative institutional/government/industry publications.
- Verify that a source actually supports the statement before citing it.

## 7. Existing 2020 Reference

- There is already a 2020 reference in the paper.
- Do not replace, remove, or flag that reference simply because it is from 2020.
- The 2021-2026 restriction applies to new sources introduced during revision, not automatically to references already present.
- Only raise an issue with the existing 2020 reference if there is a substantive problem, such as not supporting the claim being made.

## 8. Do Not Invent System Information

- Never change a technical statement merely because something sounds more modern or technically likely.
- If the current implementation needs to be known, verify it against the actual project through Codex first.
- Clearly distinguish between information established by the current system/codebase, information supported by academic/external references, and explanatory improvements to the writing.

## 9. Preserve the Paper Where Possible

- Do not unnecessarily rewrite sections that are already accurate and appropriate.
- Focus revisions on what actually needs improvement, correction, updating, or alignment with the current system.
- Preserve the paper's existing structure, academic tone, and formatting unless there is a reason to change them or the user specifically requests restructuring.

## 10. Overall Goal

Gradually update the same working `.docx` so it accurately reflects the current capstone system while making every revision easy to identify.

The working paper should make clear:

```text
what changed -> why it changed -> what was verified from the actual system -> what came from literature -> what should be double-checked -> what needs to be transferred to the shared OneDrive paper.
```

