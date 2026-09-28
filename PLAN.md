# Math Defense — Plan

A top-down tower defense game for the browser in which towers only fire when the player answers a math problem correctly. Target audience: 10-year-olds. Geometric shapes for now; textures, music and sound come later.

The game title is **Math Defense** in both languages; all other UI text is in Dutch and English.

## 1. Tech stack & setup

- **Phaser 4.2.1**, **Vite 8.3.1**, **TypeScript**, **Vitest** for unit tests.
- Fixed design resolution 1280×720, `Phaser.Scale.FIT` + auto-center, so it looks the same on laptop, tablet and fullscreen.
- **Git + GitHub:** public repo `jeroenjanssens/math-defense` (https://github.com/jeroenjanssens/math-defense).
- **Deployment:** **GitHub Pages** via a GitHub Actions workflow on push to `main`, at https://jeroenjanssens.github.io/math-defense/. The Vite `base` is `/math-defense/`.
- **No backend:** all data (profiles, progress, settings) is stored in `localStorage`, with JSON export/import for backup and moving between devices.

### Project structure

```
index.html
vite.config.ts
public/                    # PWA manifest and icons
.github/workflows/deploy.yml
src/
  main.ts                  # Phaser game config
  rotatePrompt.ts          # "turn your tablet" overlay in portrait
  audio/sfx.ts             # sound hooks (silent for now)
  config/
    balance.ts             # waves, enemies, towers, economy, difficulty presets
    map.ts                 # path and build spots
  i18n/
    nl.ts, en.ts           # string dictionaries
    i18n.ts                # t('key'), language switching, operator symbols
  math/                    # pure TS, no Phaser dependency, fully unit-tested
    types.ts               # Problem, Category, MathSettings
    generators.ts          # one generator per category
    sequencer.ts           # random / in-order / adaptive problem selection
    distractors.ts         # plausible wrong answers for multiple choice
    expr.ts, rng.ts
  profiles/
    profile.ts             # profile model and defaults
    profileStore.ts        # CRUD profiles in localStorage, export/import
    progress.ts            # per-fact statistics
  state/session.ts         # current profile
  game/                    # game logic used by GameScene
    Quiz.ts                # current problem, input, streak, timer
    WaveManager.ts         # waves and breaks
    World.ts, Path.ts      # map, enemies, towers, projectiles, effects
    Tutorial.ts            # guided first game
  entities/  Enemy.ts, Tower.ts
  scenes/
    BootScene.ts           # generate shape textures
    ProfileScene.ts        # choose / create profile
    MenuScene.ts           # main menu
    SettingsScene.ts       # math + game settings
    GameScene.ts           # the game, with HUD, answer panel and build menu
    PauseScene.ts
    GameOverScene.ts       # results of this session
    ProgressScene.ts       # progress tracking / parent overview
  ui/        Button.ts, Dialog.ts, NumPad.ts, HtmlInput.ts, Hud.ts,
             AnswerPanel.ts, BuildMenu.ts, FullscreenButton.ts, theme.ts, ...
tests/       math + profile tests
```

## 2. Core gameplay loop

1. Enemies follow a fixed path from the spawn point to the base.
2. A math problem is always visible in the answer panel.
3. **Correct:** all towers fire a volley. This is the *only* way towers fire, with no auto-fire.
4. **Wrong:** a soft red shake, then the correct answer is shown for about 1.5 s and a new problem follows. There is no extra penalty beyond the missed shot.
5. Enemies reaching the base cost lives. The game ends at 0 lives, and the player wins after the final wave.
6. Correct answers earn **coins**, spent between waves on new towers and upgrades.
7. **Streak:** 5 correct in a row gives a power shot, with a visible combo meter.

### Timer (configurable)

- Setting: **Timer on/off**, plus the duration per problem (e.g. 5 / 10 / 15 / 20 / 30 s).
- When on, a shrinking bar is shown around or under the problem.
- A timeout counts as a wrong answer: the correct answer is shown and the next problem follows.
- A timeout is recorded separately in the statistics, so "slow" and "wrong" can be told apart.
- Default: **off**.

## 3. Answer modes

- **Typing:**
  - Laptop: the physical keyboard. Digits, `-` (when negatives are enabled), Backspace, Enter.
  - Tablet: an **on-screen numpad** with 0–9, ⌫, ± (only when negatives are enabled) and ✓. The numpad is shown automatically on touch devices and can be toggled manually. The native mobile keyboard is not used, because it covers the game.
- **Multiple choice:**
  - 4 large buttons, tappable, or keys 1–4.
  - The wrong answers are plausible: neighbouring table results, off-by-one or off-by-ten, swapped digits, a sign error (for negative problems) or wrong order of operations (for mixed problems).
- Chosen per profile. It can be changed in settings and in the pause menu.

## 4. Math settings

All settings are **per profile**, selected in the Settings screen (from the main menu) and adjustable from the pause menu. A change takes effect from the next problem. At least one category must be enabled.

### Categories (multi-select)

| Category | Example | Notes |
|---|---|---|
| Tables 1–5 | 3 × 4 | |
| Tables 6–10 | 7 × 8 | |
| Tables 11–12 | 12 × 6 | |
| Custom tables | only 7 and 9 | individual table picker, advanced |
| Addition | 27 + 15 | |
| Subtraction | 43 − 18 | |
| Division | 56 : 7 | inverse of the selected tables, always an integer result |

### Separate modifier settings

- **Larger numbers** (off / on, or a level):
  - add/subtract range: up to 20 → up to 100 → up to 1000
  - multiplication: 2-digit × 1-digit (e.g. 23 × 4)
- **Negative numbers** (off / on):
  - subtraction may go below zero (5 − 9)
  - operands may be negative (−3 + 7, −4 × 3)
  - the ± key on the numpad is enabled
- **Mixed operations** (off / on):
  - two operations in one problem, e.g. `3 × 4 + 2`, `20 − 3 × 5`
  - order of operations applies
  - optionally with brackets: `(2 + 3) × 4`
  - uses only the enabled categories as building blocks
  - intermediate results stay within range

### Problem order

- **Random** (default): random problems from all selected categories.
- **In order** (tables only): 1 × 4, 2 × 4, … 12 × 4, then on to the next selected table (ascending).
  - Always goes up to × 12.
  - Only available when **only table categories** are selected (Tables 1–5 / 6–10 / 11–12 / custom tables). When any other category is enabled, the option is disabled with a short explanation, and the order falls back to random.
  - Not combinable with the mixed operations modifier.
  - After the last selected table, the sequence starts again from the first table.
- **Adaptive** (optional toggle, default on in random mode): facts answered wrong or slowly come back more often (a simple Leitner-box weighting per fact).

### Notation (language-dependent)

- Dutch: `×` for multiply and `:` for divide, as taught in Dutch schools.
- English: `×` and `÷`.
- Minus is always shown as a real minus sign `−`, and negative numbers are wrapped in brackets in operands: `5 × (−3)`.

## 5. Languages (Dutch & English)

- Simple typed dictionaries (`nl.ts`, `en.ts`) with a `t('key')` function. TypeScript checks that both languages have every key.
- Language is set per profile, defaulting to the browser language.
- A language toggle (NL / EN) on the profile screen and in settings.
- All UI, tutorial text, enemy names and stats use the dictionaries, with no hard-coded strings.

## 6. Profiles

- The first screen is **"Who's playing?"**: large profile cards with a name and a geometric avatar (a shape + colour picker).
- Create, rename and delete profiles. Deleting asks for confirmation.
- Each profile stores:
  - name, avatar and language
  - math settings and game settings (answer mode, timer, difficulty)
  - progress statistics
  - high scores and highest wave reached
- **Export/import** all profiles as a JSON file. This is needed because `localStorage` is per browser and per device.

## 7. Progress tracking

For every individual fact (e.g. `7 × 8`) the game records the statistics below. Facts are **counted separately by order**, so `4 × 1` and `1 × 4` are different facts (and `8 × 7` is a separate cell from `7 × 8` in the grid).

Per fact:

- times asked, correct, wrong and timed out
- average answer time
- last seen

**Progress screen (per profile):**

- A **table grid**: a 12×12 multiplication grid, each cell coloured green / orange / red / grey (not practised yet).
- **Per-category accuracy** bars (addition, subtraction, …).
- **"Needs practice"** list: the 5–10 weakest facts, with a button that starts a game practising exactly those.
- **Session history**: date, duration, number of problems, accuracy, wave reached.

The end-of-game screen shows a short summary: accuracy, best streak, and the 3 facts to practise.

Viewable by both the child and the parent. A parent lock (**hold the button for 3 seconds**) protects deleting profiles, resetting progress and importing data.

## 8. Laptop & tablet support

- Landscape layout. On a portrait tablet, a "rotate your device" message is shown.
- **Touch targets:** all buttons at least about 48 px at the design resolution.
- **Tower placement:** tap an empty build spot, then pick a tower from a radial or popup menu. This works the same way with mouse and touch, so there is no drag-and-drop and no hover-only interactions.
- **Keyboard shortcuts on laptop:**
  - P / Esc: pause
  - F: fullscreen
  - 1–4: multiple choice
  - Enter: submit
- **Fullscreen:** via `scale.startFullscreen()`. iPad Safari has limited Fullscreen API support, so the fullscreen button is hidden where it's unsupported. A minimal PWA manifest allows "Add to Home Screen" for a fullscreen-like experience.

## 9. Interface

**Profile screen:** Who's playing? New profile, language toggle.

**Main menu:**
- Play
- Settings
- Progress
- Switch profile

**Settings screen:**
- Categories (multi-select toggles)
- Larger numbers / Negatives / Mixed operations
- Order: random / in order
- Answer mode: typing / multiple choice
- Timer on/off + duration
- Difficulty: Easy / Normal / Hard (enemy speed and health)
- Language

**In-game HUD:**
- Lives, coins, wave x/10, streak meter
- Buttons:
  - ⏸ pause
  - ⛶ fullscreen
  - ↻ new game, with confirmation
- **Answer panel** on the right side of the screen: the problem, the input or choices, the timer bar, and the numpad when active.

**Pause menu:**
- Resume
- Change settings
- New game
- Main menu

**Game-over / victory screen:**
- Score, accuracy, best streak
- Facts to practise
- Play again
- Menu

## 10. Tutorial

- A short guided first game, started automatically the first time a profile plays. It can be replayed from the main menu.
- Steps, each with a highlight and a short text (NL/EN):
  1. "Monsters walk along this path to your base."
  2. "Answer the problem to make your towers fire!" (the game waits until the first correct answer)
  3. "Correct answers earn coins." (points at the coin counter)
  4. "Tap a build spot to place a new tower." (the game waits until a tower is placed)
  5. "Get 5 correct in a row for a power shot!"
  6. "Pause, fullscreen and settings are up here."
- Enemies are slow during the tutorial, and the player can't lose.
- There is a "skip tutorial" button.

## 11. Visual style (geometric)

- **Colours:** a dark background with a bright neon/arcade palette.
- **Enemies:** shapes with googly eyes and health bars.
  - Triangle: fast
  - Square: tough
  - Pentagon: splits into smaller ones
  - Hexagon: boss
- **Towers:** circles with barrels that rotate toward the target.
  - Blaster: single target
  - Splash: area damage
  - Freezer: slows enemies
- **Feedback effects:**
  - particle bursts
  - floating "+10" coins
  - screen shake on a boss hit
  - confetti on wave clear
  - a green flash for a correct answer and a soft shake for a wrong one
- Enemies differ by **shape and colour**, so colour-blind players can tell them apart.
- **No sound or music** in this phase. The code gets an empty `audio` hook layer so sound can be added later without refactoring.

## 12. Milestones

1. **Scaffold:** Vite + Phaser 4 + TS + Vitest, git init, a GitHub repo, the Pages deploy workflow, and a blank scene live online.
2. **Math engine:** generators for all categories and modifiers, sequencer (random / in-order / adaptive), distractors, notation per language, full unit tests.
3. **i18n + profiles:** dictionaries, profile store, profile screen, export/import.
4. **Core loop:** map, path, enemies, base, lives, one tower firing on a correct answer.
5. **Answer panel:** typing, numpad, multiple choice, timer.
6. **Menus:** main menu, settings, pause, game over, HUD buttons, fullscreen.
7. **Economy & waves:** coins, build spots, 3 tower types, upgrades, 10 waves + boss, difficulty presets.
8. **Progress tracking:** statistics recording, progress screen, table grid, "practise weak facts".
9. **Tablet polish:** touch testing, the rotate prompt, PWA manifest.
10. **Tutorial & polish:** the guided first game, particles, tweens, streaks.

## 13. Later

- Textures and sprites
- Sound effects and music
- More maps
- Achievements and unlockables
- More tower types
