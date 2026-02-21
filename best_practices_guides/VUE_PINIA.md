# VUE_PINIA.md

## State model
- Keep the full graph out of deep reactive trees.
- Store the parsed summary and index maps in shallow refs where possible.
- Use derived computed values for prompt output and token estimates.

## Performance patterns
- Heavy parsing and transforms in a Web Worker.
- Use virtualization for node trees over 500 nodes.
- Debounce prompt regeneration for rapid UI toggling.

## UX patterns
- Make defaults safe.
- Show what changed when toggles change. Diff mode.
- Keep all controls labeled and keyboard accessible.
