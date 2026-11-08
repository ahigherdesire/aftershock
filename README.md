# Aftershock

A complete, dependency-free browser block puzzle with delayed gravity and cascading clears.

## Run

From this directory, run `npm run dev`, then open http://127.0.0.1:4174.

Run `npm test` for the pure game-engine tests. The `dist` folder is the deployable static application; no build step is needed.

## Play

Drag one of three shapes to an 8×8 board. Or tap a shape, then tap a cell to position its top-left corner. Shapes cannot rotate. Complete a row or column to clear it. Only after a clear, each remaining square falls to the bottom of its column. Newly completed lines trigger further clears with increasing score multipliers.

- 10 points per placed square.
- 100 points per cleared line × cascade wave number.
- 500 bonus points for clearing the entire board.
- All full rows and columns clear simultaneously; intersection cells clear once.
- New shapes arrive after all three tray shapes are used. The refill ensures at least one shape fits if any space remains. Runs end when none of the remaining shapes can fit.

Keyboard: 1–3 select pieces, arrow keys move the cursor, Space or Enter places. Escape deselects. The interface supports undo, persistent local sessions and high scores, three playback speeds, optional synthesized audio, and reduced motion. The practice setup parks your current game, demonstrates a two-wave chain, and restores the parked game afterward. Practice never changes your record.

Source: `dist/engine.mjs` contains deterministic gameplay; `dist/app.mjs` handles interaction and playback; `dist/style.css` controls presentation. Design decisions and verification plan are in `docs/design.md`.
