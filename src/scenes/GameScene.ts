import Phaser from 'phaser';
import { playSfx } from '../audio/sfx';
import {
  DIFFICULTIES,
  ECONOMY,
  POWER_SHOT_MULTIPLIER,
  STREAK_FOR_POWER_SHOT,
  TOWERS,
  TUTORIAL_SPEED,
  TUTORIAL_WAVE,
  WAVES,
  waveHpMultiplier,
  type DifficultySpec,
  type EnemyType,
  type TowerType,
} from '../config/balance';
import { MAP_HEIGHT, MAP_WIDTH, MAP_X, MAP_Y, START_TOWER_SPOT, TUTORIAL_BUILD_SPOT } from '../config/map';
import type { Enemy } from '../entities/Enemy';
import type { Tower } from '../entities/Tower';
import { Quiz, type AnswerOutcome } from '../game/Quiz';
import { Tutorial } from '../game/Tutorial';
import { WaveManager } from '../game/WaveManager';
import { World } from '../game/World';
import { t } from '../i18n/i18n';
import type { Profile } from '../profiles/profile';
import { recordSession } from '../profiles/progress';
import { requireProfile, saveProfile } from '../state/session';
import { AnswerPanel, type InputMode } from '../ui/AnswerPanel';
import { BuildMenu } from '../ui/BuildMenu';
import { confirmDialog, showToast } from '../ui/Dialog';
import { toggleFullscreen } from '../ui/FullscreenButton';
import { Hud } from '../ui/Hud';
import { COLORS, isTouchDevice, setupCamera, textStyle } from '../ui/theme';
import type { GameOverData } from './GameOverScene';
import { SETTINGS_CHANGED } from './SettingsScene';

export interface GameData {
  tutorial?: boolean;
  /** Only ask these facts (from the progress screen). */
  practiceKeys?: string[];
}

const FIRST_BREAK_MS = 8000;

/**
 * The digit a key press stands for. Falls back to the physical key, so the number row works on
 * AZERTY keyboards without Shift and the numeric keypad works with NumLock off.
 */
const digitOf = (event: KeyboardEvent): number | null => {
  if (/^[0-9]$/.test(event.key)) return Number(event.key);
  if (event.ctrlKey || event.metaKey || event.altKey) return null;
  const match = /^(?:Digit|Numpad)([0-9])$/.exec(event.code);
  return match ? Number(match[1]) : null;
};
const NEXT_AFTER_CORRECT_MS = 650;
const NEXT_AFTER_WRONG_MS = 1900;

export class GameScene extends Phaser.Scene {
  private profile!: Profile;
  private data0: GameData = {};
  private difficulty!: DifficultySpec;
  private world!: World;
  private quiz!: Quiz;
  private waves!: WaveManager;
  private hud!: Hud;
  private panel!: AnswerPanel;
  private buildMenu!: BuildMenu;
  private tutorial: Tutorial | null = null;

  private lives = 0;
  private coins = 0;
  private score = 0;
  private startedAt = 0;
  /** True while a dialog is open: the world and timers stand still. */
  private frozen = false;
  private over = false;
  private sessionRecorded = false;
  private nextTimer?: Phaser.Time.TimerEvent;

  constructor() {
    super('Game');
  }

  init(data: GameData): void {
    this.data0 = data ?? {};
    this.tutorial = null;
    this.frozen = false;
    this.over = false;
    this.sessionRecorded = false;
    this.score = 0;
  }

  get isTutorial(): boolean {
    return Boolean(this.data0.tutorial);
  }

  create(): void {
    setupCamera(this);
    this.cameras.main.setBackgroundColor(COLORS.bg);
    this.profile = requireProfile();
    this.difficulty = DIFFICULTIES[this.profile.game.difficulty];
    this.lives = this.difficulty.lives;
    this.coins = this.difficulty.startCoins;
    this.startedAt = Date.now();

    this.world = new World(this, {
      onKill: (enemy) => this.onKill(enemy),
      onLeak: (enemy) => this.onLeak(enemy),
      onSpotClicked: (spot) => this.onSpotClicked(spot),
      onTowerClicked: (tower) => this.onTowerClicked(tower),
    });
    this.world.build(START_TOWER_SPOT, 'blaster');

    this.quiz = new Quiz({
      math: this.profile.math,
      answerMode: this.profile.game.answerMode,
      timerSeconds: this.timerSeconds(),
      progress: this.profile.progress,
      practiceKeys: this.data0.practiceKeys,
    });

    this.waves = this.isTutorial
      ? new WaveManager([TUTORIAL_WAVE], ECONOMY.breakSeconds * 1000, 0)
      : new WaveManager(WAVES, ECONOMY.breakSeconds * 1000, FIRST_BREAK_MS);

    this.hud = new Hud(this, {
      onPause: () => this.pauseGame(),
      onNewGame: () => this.confirmNewGame(),
      onStartWave: () => this.waves.startNow(),
    });
    this.hud.setLives(this.lives);
    this.hud.setCoins(this.coins);

    this.panel = new AnswerPanel(this, {
      onDigit: (d) => this.withInput(() => this.quiz.typeDigit(d)),
      onBackspace: () => this.withInput(() => this.quiz.backspace()),
      onToggleSign: () => this.withInput(() => this.quiz.toggleSign()),
      onSubmit: () => this.submit(),
      onChoose: (i) => this.choose(i),
    });
    this.panel.setMode(this.inputMode());
    this.panel.setPractice(this.quiz.isPractice);

    this.buildMenu = new BuildMenu(this, {
      getCoins: () => this.coins,
      onBuild: (spot, kind) => this.buildTower(spot, kind),
      onUpgrade: (tower) => this.upgradeTower(tower),
      onSell: (tower) => this.sellTower(tower),
    });

    window.addEventListener('keydown', this.onKey);
    this.game.events.on(SETTINGS_CHANGED, this.applySettings, this);
    document.addEventListener('visibilitychange', this.onVisibility);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      window.removeEventListener('keydown', this.onKey);
      this.game.events.off(SETTINGS_CHANGED, this.applySettings, this);
      document.removeEventListener('visibilitychange', this.onVisibility);
      this.tutorial?.destroy();
    });

    if (this.isTutorial) this.startTutorial();
    else if (this.quiz.isPractice) showToast(this, t('hud.practice'), COLORS.purple, 120);

    this.nextProblem();
  }

  // ---------------------------------------------------------------- settings

  private timerSeconds(): number | null {
    if (this.isTutorial || !this.profile.game.timerEnabled) return null;
    return this.profile.game.timerSeconds;
  }

  private inputMode(): InputMode {
    if (this.profile.game.answerMode === 'choice') return 'choice';
    const numpad = this.profile.game.numpad;
    if (numpad === 'on') return 'numpad';
    if (numpad === 'off') return 'keyboard';
    return isTouchDevice() ? 'numpad' : 'keyboard';
  }

  /** Called when settings were changed from the pause menu. */
  private applySettings(): void {
    this.profile = requireProfile();
    this.quiz.updateOptions({
      math: this.profile.math,
      answerMode: this.profile.game.answerMode,
      timerSeconds: this.timerSeconds(),
    });
    this.quiz.setAnswerMode(this.profile.game.answerMode);
    this.panel.setMode(this.inputMode());
    this.panel.refreshTexts();
    if (this.quiz.accepting) {
      this.quiz.input = '';
      this.panel.showProblem(this.quiz.problem, this.quiz.choices, this.quiz.allowsNegative);
    }
  }

  // ---------------------------------------------------------------- problems

  private nextProblem(): void {
    this.nextTimer = undefined;
    if (this.over) return;
    this.quiz.next();
    this.panel.resetChoiceColors();
    this.panel.showProblem(this.quiz.problem, this.quiz.choices, this.quiz.allowsNegative);
    this.panel.setTimer(this.quiz.timeLeft);
  }

  private get inputBlocked(): boolean {
    return this.frozen || this.over || Boolean(this.tutorial?.waitingForNext && this.tutorial.step === 'path');
  }

  /** Answering during the tutorial's intro step skips straight to the answer step instead of ignoring the input. */
  private leaveTutorialIntro(): void {
    if (this.tutorial?.waitingForNext && this.tutorial.step === 'path') this.tutorial.next();
  }

  private withInput(fn: () => void): void {
    this.leaveTutorialIntro();
    if (this.inputBlocked) return;
    fn();
    this.panel.setInput(this.quiz.input);
  }

  private submit(): void {
    if (this.inputBlocked) return;
    const outcome = this.quiz.submit();
    if (outcome) this.handleOutcome(outcome, null);
  }

  private choose(index: number): void {
    this.leaveTutorialIntro();
    if (this.inputBlocked) return;
    const outcome = this.quiz.choose(index);
    if (outcome) this.handleOutcome(outcome, index);
  }

  private handleOutcome(outcome: AnswerOutcome, chosenIndex: number | null): void {
    this.panel.showOutcome(outcome, chosenIndex);
    this.panel.setTimer(null);
    this.hud.setStreak(outcome.streak);

    if (outcome.result === 'correct') {
      playSfx('correct');
      const bonus = Math.min(outcome.streak - 1, ECONOMY.streakBonusMax);
      const earned = ECONOMY.coinsPerCorrect + bonus;
      this.addCoins(earned);
      this.world.floatText(190, 88, `+${earned}`, COLORS.yellow, 22);
      this.score += ECONOMY.pointsPerCorrect;

      const power = outcome.streak > 0 && outcome.streak % STREAK_FOR_POWER_SHOT === 0;
      if (power) {
        this.panel.flash(t('hud.powerShot'), COLORS.yellow);
        this.cameras.main.flash(180, 255, 214, 10, false);
        playSfx('powerShot');
      }
      this.world.volley(power ? POWER_SHOT_MULTIPLIER : 1);
      this.tutorial?.notify('correct');
    } else {
      playSfx(outcome.result === 'timeout' ? 'timeout' : 'wrong');
    }

    saveProfile(this.profile);
    this.nextTimer = this.time.delayedCall(
      outcome.result === 'correct' ? NEXT_AFTER_CORRECT_MS : NEXT_AFTER_WRONG_MS,
      () => this.nextProblem(),
    );
  }

  // ---------------------------------------------------------------- keyboard

  private onKey = (event: KeyboardEvent): void => {
    if (!this.scene.isActive() || this.frozen || this.over || event.repeat) return;
    const key = event.key;
    if (key === 'Escape') {
      if (this.buildMenu.isOpen) this.buildMenu.close();
      else this.pauseGame();
      return;
    }
    if (key === 'p' || key === 'P') return this.pauseGame();
    if (key === 'f' || key === 'F') return toggleFullscreen(this);

    if (this.tutorial?.waitingForNext && (key === 'Enter' || key === ' ')) {
      this.tutorial.next();
      return;
    }

    const digit = digitOf(event);
    if (this.quiz.choices) {
      if (digit !== null && digit >= 1 && digit <= this.quiz.choices.length) this.choose(digit - 1);
      return;
    }
    if (digit !== null) this.withInput(() => this.quiz.typeDigit(digit));
    else if (key === '-' || key === '_') this.withInput(() => this.quiz.toggleSign());
    else if (key === 'Backspace') {
      event.preventDefault();
      this.withInput(() => this.quiz.backspace());
    } else if (key === 'Enter') this.submit();
  };

  // ---------------------------------------------------------------- economy

  private addCoins(amount: number): void {
    this.coins += amount;
    this.hud.setCoins(this.coins);
    this.buildMenu.refresh();
  }

  private onSpotClicked(spot: number): void {
    if (this.frozen || this.over) return;
    const { x, y } = this.world.spotPosition(spot);
    this.buildMenu.openBuild(spot, x, y);
  }

  private onTowerClicked(tower: Tower): void {
    if (this.frozen || this.over) return;
    this.buildMenu.openTower(tower);
  }

  private buildTower(spot: number, kind: TowerType): void {
    const cost = TOWERS[kind].cost;
    if (this.coins < cost || this.world.towers[spot]) return;
    playSfx('build');
    this.addCoins(-cost);
    this.world.build(spot, kind);
    this.tutorial?.notify('built');
  }

  private upgradeTower(tower: Tower): void {
    const cost = tower.upgradeCost;
    if (!tower.canUpgrade || this.coins < cost) return;
    playSfx('upgrade');
    this.addCoins(-cost);
    tower.upgrade();
    this.world.burst(tower.x, tower.y, COLORS.green, 14);
  }

  private sellTower(tower: Tower): void {
    playSfx('sell');
    this.addCoins(tower.sellValue);
    this.world.floatText(tower.x, tower.y - 20, `+${tower.sellValue}`, COLORS.yellow);
    this.world.sell(tower);
  }

  // ---------------------------------------------------------------- world events

  private onKill(enemy: Enemy): void {
    const reward = enemy.spec.reward;
    this.addCoins(reward);
    this.score += ECONOMY.pointsPerKill;
    this.world.floatText(enemy.x, enemy.y - 24, `+${reward}`, COLORS.yellow, 20);
    if (enemy.kind === 'boss') this.cameras.main.shake(350, 0.012);
  }

  private onLeak(enemy: Enemy): void {
    this.world.hitBase();
    this.cameras.main.shake(200, 0.006);
    playSfx('baseHit');
    if (this.isTutorial) return;
    this.lives = Math.max(0, this.lives - enemy.spec.damage);
    this.hud.setLives(this.lives, true);
    if (this.lives <= 0) this.endGame(false);
  }

  private spawn(kind: EnemyType): void {
    const hp = this.isTutorial ? 1 : this.difficulty.hp * waveHpMultiplier(this.waves.index);
    const speed = this.isTutorial ? 1 : this.difficulty.speed;
    this.world.spawn(kind, hp, speed);
  }

  // ---------------------------------------------------------------- loop

  update(_time: number, delta: number): void {
    if (this.frozen || this.over) return;
    const dt = Math.min(delta, 100);

    const update = this.waves.update(dt, this.world.enemyCount);
    update.spawns.forEach((kind) => this.spawn(kind));
    if (update.waveStarted) this.onWaveStarted();
    if (update.waveCleared) this.onWaveCleared(update.allCleared);
    if (this.over) return;

    this.world.update(dt);

    if (!this.tutorial?.waitingForNext) {
      const timeout = this.quiz.tick(dt);
      if (timeout) this.handleOutcome(timeout, null);
      else if (this.quiz.accepting) this.panel.setTimer(this.quiz.timeLeft);
    }

    const inBreak = this.waves.phase === 'break' && !this.isTutorial;
    this.hud.setWave(this.waves.waveNumber, this.waves.total, inBreak ? Math.ceil(this.waves.breakLeftMs / 1000) : null);
  }

  private onWaveStarted(): void {
    if (this.isTutorial) return;
    playSfx('waveStart');
    const spec = this.waves.currentSpec;
    const boss = spec?.groups.some((g) => g.type === 'boss');
    this.banner(t('hud.wave', { wave: this.waves.waveNumber, total: this.waves.total }), boss ? t('hud.bossWave') : undefined);
  }

  private onWaveCleared(allCleared: boolean): void {
    if (this.isTutorial) {
      // The tutorial wave ran out before the steps were done: just start a real game.
      if (allCleared) this.finishTutorial();
      return;
    }
    const cleared = this.waves.index; // already advanced
    const bonus = ECONOMY.waveClearBase + ECONOMY.waveClearPerWave * cleared;
    this.addCoins(bonus);
    this.score += ECONOMY.pointsPerWave;
    this.profile.bestWave = Math.max(this.profile.bestWave, cleared);
    saveProfile(this.profile);
    this.confetti();
    playSfx('waveCleared');
    if (allCleared) {
      this.endGame(true);
    } else {
      this.banner(t('hud.waveCleared'), `+${bonus}`);
    }
  }

  private banner(title: string, subtitle?: string): void {
    const cx = MAP_X + MAP_WIDTH / 2;
    const cy = MAP_Y + MAP_HEIGHT / 2;
    const items: Phaser.GameObjects.Text[] = [
      this.add.text(cx, cy - 20, title, textStyle(64, COLORS.yellow, '700', { stroke: '#0b1026', strokeThickness: 10 })).setOrigin(0.5),
    ];
    if (subtitle) {
      items.push(
        this.add.text(cx, cy + 40, subtitle, textStyle(32, COLORS.text, '700', { stroke: '#0b1026', strokeThickness: 8 })).setOrigin(0.5),
      );
    }
    items.forEach((item) => item.setDepth(70));
    this.tweens.add({ targets: items, scale: { from: 0.3, to: 1 }, duration: 350, ease: 'Back.easeOut' });
    this.tweens.add({
      targets: items,
      alpha: 0,
      delay: 1500,
      duration: 400,
      onComplete: () => items.forEach((item) => item.destroy()),
    });
  }

  private confetti(): void {
    const colors = [COLORS.yellow, COLORS.pink, COLORS.cyan, COLORS.green, COLORS.orange, COLORS.purple];
    for (let i = 0; i < 12; i++) {
      this.time.delayedCall(i * 60, () => {
        const x = MAP_X + Phaser.Math.Between(80, MAP_WIDTH - 80);
        const y = MAP_Y + Phaser.Math.Between(60, MAP_HEIGHT - 60);
        this.world.burst(x, y, colors[i % colors.length], 18);
      });
    }
  }

  // ---------------------------------------------------------------- tutorial

  private startTutorial(): void {
    this.world.speedScale = TUTORIAL_SPEED;
    this.tutorial = new Tutorial(this, {
      path: this.world.path.points,
      answerBounds: this.panel.problemBounds,
      coinsBounds: this.hud.coinsBounds,
      streakBounds: this.hud.streakBounds,
      buttonsBounds: this.hud.buttonsBounds,
      buildSpot: this.world.spotPosition(TUTORIAL_BUILD_SPOT),
      onStep: (step) => {
        this.world.speedScale = step === 'path' ? 0 : TUTORIAL_SPEED;
        if (step === 'build' && this.coins < TOWERS.blaster.cost) this.addCoins(TOWERS.blaster.cost - this.coins);
      },
      onDone: () => this.finishTutorial(),
      onSkip: () => this.finishTutorial(),
    });
    this.tutorial.start();
  }

  private finishTutorial(): void {
    if (this.over) return;
    this.over = true;
    this.tutorial?.destroy();
    this.profile.tutorialDone = true;
    saveProfile(this.profile);
    this.banner(t('tutorial.done'));
    this.time.delayedCall(1200, () => this.scene.restart({ tutorial: false }));
  }

  // ---------------------------------------------------------------- pause / end

  pauseGame(): void {
    if (this.over || this.frozen) return;
    this.buildMenu.close();
    this.scene.launch('Pause');
    this.scene.pause();
  }

  private onVisibility = (): void => {
    if (document.hidden && this.scene.isActive()) this.pauseGame();
  };

  private async confirmNewGame(): Promise<void> {
    if (this.over || this.frozen) return;
    this.buildMenu.close();
    this.frozen = true;
    const ok = await confirmDialog(this, t('hud.newGameConfirm'));
    this.frozen = false;
    if (ok) this.restartGame();
  }

  /** Store this game in the session history (once, and only when something was answered). */
  private recordSession(won: boolean): void {
    if (this.sessionRecorded || this.isTutorial || this.quiz.asked === 0) return;
    this.sessionRecorded = true;
    recordSession(this.profile.progress, {
      date: this.startedAt,
      durationMs: Date.now() - this.startedAt,
      asked: this.quiz.asked,
      correct: this.quiz.correct,
      wrong: this.quiz.wrong,
      timeouts: this.quiz.timeouts,
      wave: won ? this.waves.total : this.waves.waveNumber,
      won,
      score: this.score,
      bestStreak: this.quiz.bestStreak,
    });
    saveProfile(this.profile);
  }

  /** New game with the same options (from the HUD or pause menu). */
  restartGame(): void {
    this.recordSession(false);
    this.scene.restart({ practiceKeys: this.data0.practiceKeys });
  }

  quitToMenu(): void {
    this.recordSession(false);
    this.scene.start('Menu');
  }

  private endGame(won: boolean): void {
    if (this.over) return;
    this.over = true;
    this.nextTimer?.remove();
    this.buildMenu.close();
    this.recordSession(won);
    const newHighScore = this.score > this.profile.highScore;
    if (newHighScore) this.profile.highScore = this.score;
    const wave = won ? this.waves.total : this.waves.waveNumber;
    this.profile.bestWave = Math.max(this.profile.bestWave, won ? this.waves.total : wave - 1);
    saveProfile(this.profile);

    const data: GameOverData = {
      won,
      score: this.score,
      asked: this.quiz.asked,
      correct: this.quiz.correct,
      bestStreak: this.quiz.bestStreak,
      wave,
      totalWaves: this.waves.total,
      newHighScore,
      mistakes: [...this.quiz.mistakes].reverse(),
      practiceKeys: this.data0.practiceKeys,
    };
    playSfx(won ? 'victory' : 'defeat');
    if (!won) this.cameras.main.shake(500, 0.015);
    this.time.delayedCall(won ? 1200 : 900, () => this.scene.start('GameOver', data));
  }
}
