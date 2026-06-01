## List / Table Layout Switcher (SDD)

### Purpose

Introduce a **layout switcher** so the user can toggle the main set grid between the existing card view and a compact list/table representation. The list layout should prioritize scannability for dense collections while still surfacing the same core metadata and a tiny thumbnail on the left.

### Scope

- Show a toggle control (e.g., icon buttons or segmented switch) near the sort/filter toolbar that flips between “card” and “list/table” modes.
- The list view must keep honoring the active tab (`collection` vs `wishlist`), filters, and sort order that already exist for the grid.
- Persisting the choice across sessions is optional unless future work is requested; the spec only covers the UI controls and layout.

### Desktop layout

Each row in the list should resemble a single table entry with the following requirements:

1. **Thumbnail column (leftmost):**
   - Display a very small preview of the set (e.g., 48×48 px, maintaining aspect ratio).
   - Keep the picture vertically centered alongside the row’s text.

2. **Text columns (to the right of the thumbnail):**
   - **Name** – the set’s display name (`setName`); allow overflow ellipsis.
   - **Set Number** – use `setNumber`.
   - **Lego Set Number** – the `legoReferenceNumber` column.
   - **Piece Count** – show integer piece count (`pieceCount`).
   - **Price per Piece** – present the derived `pricePerPiece` with the existing formatting (e.g., `€x` or `ct/piece`) as used elsewhere in the UI.
   - **Status** – badge showing the same status text and color cycling behavior as the cards.

3. Use separator lines or subtle borders to keep rows distinguishable, matching the existing theme (light/dark).

4. Ensure the whole row remains keyboard-focusable/clickable like cards so users can still open the edit overlay by clicking the row.

### Mobile layout

The list rows wrap content to two text lines while keeping the thumbnail on the left spanning both lines:

1. **Layout:**
   - Left column: thumbnail (same small size) vertically aligned to span both text lines.
   - Right column: two stacked lines of metadata.

2. **Line 1 – Primary info:**
   - `Name`
   - `Set Number`
   - `Lego Set Number`
   - Use spacing or delimiters (e.g., `•` or `—`) so the three values stay readable on a single line.

3. **Line 2 – Secondary info:**
   - `Piece Count`
   - `Price per Piece`
   - `Status`
   - Keep the status badge/tap target consistent with desktop.

4. Maintain ample horizontal padding/margins to keep text from touching screen edges and ensure rows are tall enough for legibility.

### Behavior & interactions

- The switcher should default to the existing card/grid view so the current experience remains unchanged until the user opts into the list.
- Switching layouts should not reload data; it should only change the DOM structure and styling.
- The list should include the same buttons/controls for status cycling, editing, and deleting (via row actions or contextual menu) as the cards; if the existing action buttons become too cramped, expose them on hover or via a trailing “···” menu in the row.

### Acceptance Criteria

1. User can toggle between card and list/table layouts via a control near the toolbar.
2. Desktop list rows show the thumbnail plus the six metadata columns listed above.
3. Mobile list rows display the two text lines with the thumbnail spanning both lines.
4. Status badges remain clickable to cycle state in list rows.
5. The list honors current filters, tabs, and sorting.
6. Visual spacing and theming match the rest of the app, and rows are keyboard accessible.
