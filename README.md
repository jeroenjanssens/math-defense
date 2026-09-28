# Math Defense

A top-down tower defense game where your towers only fire when you answer a math problem correctly. Made for kids who want to practise their multiplication tables (and more).

Play it at <https://jeroenjanssens.github.io/math-defense/>.

## How to play

- Enemies walk along the path towards your base. Stop them before they get there!
- Your towers only fire when you answer a math problem correctly. Type the answer and press Enter, use the on-screen numpad, or pick one of four answers.
- Correct answers and defeated enemies earn coins. Tap an empty build spot to build a tower, or tap a tower to upgrade or sell it.
- Answer 5 in a row for a power shot.
- A wrong answer costs nothing. The game just shows you the right answer.

Keys: `0`–`9`, `-`, Backspace, Enter · `1`–`4` in multiple-choice mode · `P`/Esc to pause · `F` for fullscreen.

## Features

- Tables 1–12, plus, minus, division and mixed problems, with optional negative numbers, larger numbers and mixed operations
- Tables in order (1×4, 2×4, …) or random, with extra practice of weak facts
- Optional answer timer, three difficulty levels, multiple choice mode
- Dutch and English
- Profiles with progress tracking: a 12×12 mastery grid, per-category accuracy and facts to practise
- A parent lock (hold for 3 seconds) before deleting a profile, resetting progress or importing data
- A guided tutorial the first time you play
- Works on laptops and tablets, and can be installed as an app from the browser

Progress is stored in the browser (localStorage) and can be exported and imported from the profile screen.

## Development

```sh
npm install
npm run dev      # start the dev server
npm test         # run the unit tests
npm run build    # type-check and build to dist/
```

Built with [Phaser 4](https://phaser.io) and [Vite](https://vite.dev).
