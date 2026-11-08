# Aftershock

A small browser puzzle built from the user's request for a more compelling Block Blast-style game. Implementation choice: dependency-free HTML, CSS and JavaScript, with a pure deterministic engine and a static private Site.

## Chosen design

Drag fixed polyominoes from a tray of three onto an 8×8 board. All occupied rows and columns clear simultaneously. Only after a clear, individual squares fall down within their columns. Newly completed lines clear, scoring a higher chain multiplier. Repeat until stable. No timers. The run ends when none of the remaining tray pieces fits. Refill after all three pieces are used, ensuring at least one randomly chosen fitting shape if one exists. Placement adds 10 points per square; cleared lines earn 100 × lines × chain depth; an empty board earns 500.

Alternatives considered: neighbor-changing numbers (harder to read, already explored in Merge Plague) and gravity after every placement (less room to construct setups). Delayed gravity makes the cause of a cascade visible and lets players build toward it. This is a design hypothesis, not a validated retention claim or claim of originality.

## Experience

Lavender paper, ink-purple board, colorful beveled toy blocks. The game is the central element, with a compact explanation and run stats at the sides on desktop. Mobile puts score, board and tray first. Typography: Bricolage Grotesque for display, Outfit for UI, system fallbacks. Colors: paper #f5f1fc, ink #302447, board #302947, violet #9775e8, peach #faac83, mint #9bd4b7.

Default slow playback: marked lines hold ~650 ms; gravity falls over ~500 ms; pause before the next cascade. Show what is clearing and the current multiplier. Respect reduced motion while preserving explanatory pacing. Ghost placement, immediate line previews, touch drag with lift, tap-to-place, keyboard piece selection and board navigation. Persistent score/session, one-step undo, optional synthesized sound, restart, rules, and a playable practice setup.

## Plan and verification

1. Test placement bounds, collision, no-clear stability, simultaneous row/column clearing, gravity order, multi-wave chains, score, and tray availability.
2. Implement the pure engine and piece library, then run the suite.
3. Implement responsive UI and input, persistent session validation, animations and explanations.
4. Browser-check selection, placement, a known two-wave practice chain, undo, dialogs, and mobile layout. Run all tests and syntax checks.
5. Package the exact source and publish a private Site using the Sites helper.
