# Aftershock

A compact, endless browser block puzzle. Implementation: dependency-free HTML, CSS and JavaScript, with a pure deterministic engine, static hosting, and a shareable GitHub repository.

## Chosen design

Drag fixed polyominoes from a tray of three onto an 8×8 board. All full rows and columns clear simultaneously. A clear changes gravity toward its nearest edge: rows 0–3 pull up, rows 4–7 pull down, columns 0–3 pull left, and columns 4–7 pull right. Remaining individual squares compact in that direction. When multiple lines clear, the closest edge wins; equal distances retain the current direction if possible, otherwise priority is up, down, left, right. Show this outcome in the placement preview. Further clears increase the chain multiplier.

Play continues indefinitely: no timer, score ceiling, turn cap, level completion, or all-clear victory. The run ends only when none of the remaining tray pieces fits. Refill after all three pieces are used, ensuring at least one fitting shape if one exists. Placement adds 10 points per square; cleared lines earn 100 × lines × chain depth; an empty board earns 500 and play continues.

Alternatives considered: neighbor-changing numbers (harder to read, already explored in Merge Plague) and gravity after every placement (less room to construct setups). Delayed gravity makes the cause of a cascade visible and lets players build toward it. This is a design hypothesis, not a validated retention claim or claim of originality.

## Experience

A single compact game surface on blue (#233d6c), with a navy board (#112747), sharp orange, yellow, blue, purple, green and red blocks, and one Outfit font family. Score and best above the board; three shapes directly below. Help, practice and run statistics are behind the help button. No marketing panels or persistent tutorial sidebar.

Fast playback: 160 ms clears, 210 ms directional drops with accelerated descent, a hard impact and a short rebound, and only 20 ms between waves. Short particles, a landing thump when sound is enabled, and a small board impact communicate the hit. Reduced motion removes bounce, shake and particles. Ghost placement, direction preview, touch drag with lift, tap-to-place and keyboard controls remain supported. Persistent local sessions migrate without resetting the score or board. One-step undo restores gravity too. Four practice setups park the current run and never change its record.

## Plan and verification

1. Test placement bounds, collision, no-clear stability, simultaneous row/column clearing, gravity order, multi-wave chains, score, and tray availability.
2. Implement the pure engine and piece library, then run the suite.
3. Implement responsive UI and input, persistent session validation, animations and explanations.
4. Browser-check selection, direction preview, directional practice chains, dialogs and responsive layout. Run the engine suite and syntax checks.
5. Preserve the existing Site audience, publish the exact pushed source, and publish the game source and a playable GitHub Pages build.
