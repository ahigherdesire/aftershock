# Aftershock

A complete, dependency-free browser block puzzle with delayed gravity and cascading clears.

## Run

From this directory, run `npm run dev`, then open http://127.0.0.1:4174.

Run `npm test` for the pure game-engine tests. The `dist` folder is the deployable static application; no build step is needed.

## Play

Drag one of three shapes to an 8×8 board. Or tap a shape, then tap a cell to position its top-left corner. Shapes cannot rotate. Complete a row or column to clear it. Each clear changes gravity toward the nearest edge: top rows pull up, bottom rows pull down, left columns pull left, and right columns pull right. Newly completed lines trigger further clears with increasing score multipliers.

- 10 points per placed square.
- 100 points per cleared line × cascade wave number.
- 500 bonus points for clearing the entire board.
- All full rows and columns clear simultaneously; intersection cells clear once.
- On simultaneous clears, the line closest to an edge sets gravity. Equal-distance ties keep the current direction when possible, otherwise priority is up, down, left, right. The preview arrow shows the direction before placement.
- New shapes arrive after all three tray shapes are used. The refill ensures at least one shape fits if any space remains. Runs end when none of the remaining shapes can fit.
- Play is endless: no score threshold, level completion, timer, or all-clear victory ends a run.

Keyboard: 1–3 select pieces, arrow keys move the cursor, Space or Enter places. Escape deselects. The compact blue interface supports undo, persistent local sessions and high scores, optional synthesized audio, and reduced motion. Clears take 160 ms and drops take 210 ms, with a sharp impact and a short rebound. Help contains practice setups for all four directions. Practice parks your current game and restores it afterward, without changing your record. Old saved games are migrated with downward gravity and keep their score and board.

Source: `dist/engine.mjs` contains deterministic gameplay; `dist/app.mjs` handles interaction and playback; `dist/style.css` controls presentation. Design decisions and verification plan are in `docs/design.md`.
