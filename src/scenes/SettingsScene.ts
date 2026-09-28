import Phaser from 'phaser';
import { LANGUAGES, setLanguage, t, type Language } from '../i18n/i18n';
import type { TranslationKey } from '../i18n/en';
import { canUseInOrder, isValidSelection } from '../math/generators';
import { ALL_CATEGORIES, type Category, type NumberSize, type ProblemOrder } from '../math/types';
import { TIMER_OPTIONS, type AnswerMode, type Difficulty, type NumpadMode } from '../profiles/profile';
import { emptyProgress } from '../profiles/progress';
import { requireProfile, saveProfile } from '../state/session';
import { drawBackground } from '../ui/background';
import { Button, HoldButton, Segmented, ToggleButton } from '../ui/Button';
import { alertDialog, confirmDialog } from '../ui/Dialog';
import { COLORS, GAME_HEIGHT, GAME_WIDTH, setupCamera, textStyle } from '../ui/theme';

export interface SettingsData {
  from?: 'menu' | 'pause';
}

export const SETTINGS_CHANGED = 'settings-changed';

/** Math and game settings for the current player; also reachable from the pause menu. */
export class SettingsScene extends Phaser.Scene {
  private from: 'menu' | 'pause' = 'menu';
  private customTableButtons: ToggleButton[] = [];
  private bracketsControl!: Segmented<boolean>;
  private orderControl!: Segmented<ProblemOrder>;
  private orderHint!: Phaser.GameObjects.Text;
  private warning!: Phaser.GameObjects.Text;
  private secondsControl!: Segmented<number>;

  constructor() {
    super('Settings');
  }

  init(data: SettingsData): void {
    this.from = data.from ?? 'menu';
    this.customTableButtons = [];
  }

  create(): void {
    setupCamera(this);
    drawBackground(this, false);
    const profile = requireProfile();
    const math = profile.math;
    const game = profile.game;

    this.add.text(GAME_WIDTH / 2, 44, t('settings.title'), textStyle(44, COLORS.text, '700')).setOrigin(0.5);
    new Button(this, 90, 44, {
      width: 150,
      height: 56,
      label: t('common.back'),
      icon: 'back',
      color: COLORS.grey,
      fontSize: 22,
      onClick: () => void this.close(),
    });

    const onOff = (): { value: boolean; label: string }[] => [
      { value: false, label: t('common.off') },
      { value: true, label: t('common.on') },
    ];
    const label = (x: number, y: number, key: TranslationKey) =>
      this.add.text(x, y, t(key), textStyle(22, COLORS.text, '500')).setOrigin(0, 0.5);
    const header = (x: number, y: number, key: TranslationKey) =>
      this.add.text(x, y, t(key), textStyle(26, COLORS.yellow, '700')).setOrigin(0, 0.5);
    const changed = () => {
      saveProfile(profile);
      this.refresh();
    };

    // ------------------------------------------------------------ math column
    const L = 40;
    header(L, 105, 'settings.math');
    ALL_CATEGORIES.forEach((cat: Category, i) => {
      const row = i < 4 ? 0 : 1;
      const col = i < 4 ? i : i - 4;
      const w = 142;
      new ToggleButton(this, L + w / 2 + col * (w + 10), 152 + row * 58, {
        width: w,
        height: 50,
        label: t(`settings.cat.${cat}` as TranslationKey),
        fontSize: 19,
        color: i < 4 ? COLORS.primary : COLORS.cyan,
        selected: math.categories.includes(cat),
        onChange: (selected) => {
          math.categories = selected
            ? [...math.categories, cat]
            : math.categories.filter((c) => c !== cat);
          if (cat === 'customTables' && selected && math.customTables.length === 0) math.customTables = [7];
          changed();
        },
      });
    });
    for (let table = 1; table <= 12; table++) {
      const w = 44;
      const b = new ToggleButton(this, L + w / 2 + (table - 1) * (w + 6), 272, {
        width: w,
        height: 44,
        label: String(table),
        fontSize: 18,
        color: COLORS.purple,
        selected: math.customTables.includes(table),
        onChange: (selected) => {
          math.customTables = selected
            ? [...math.customTables, table].sort((a, b) => a - b)
            : math.customTables.filter((x) => x !== table);
          changed();
        },
      });
      this.customTableButtons.push(b);
    }

    label(L, 335, 'settings.numberSize');
    new Segmented<NumberSize>(this, 470, 335, {
      options: (['small', 'medium', 'large'] as const).map((v) => ({ value: v, label: t(`settings.size.${v}`) })),
      value: math.numberSize,
      width: 330,
      height: 48,
      fontSize: 18,
      onChange: (v) => {
        math.numberSize = v;
        changed();
      },
    });
    label(L, 395, 'settings.negativeNumbers');
    new Segmented<boolean>(this, 535, 395, {
      options: onOff(),
      value: math.negativeNumbers,
      width: 200,
      height: 48,
      fontSize: 18,
      onChange: (v) => {
        math.negativeNumbers = v;
        changed();
      },
    });
    label(L, 455, 'settings.mixedOperations');
    new Segmented<boolean>(this, 535, 455, {
      options: onOff(),
      value: math.mixedOperations,
      width: 200,
      height: 48,
      fontSize: 18,
      onChange: (v) => {
        math.mixedOperations = v;
        changed();
      },
    });
    label(L + 30, 515, 'settings.brackets');
    this.bracketsControl = new Segmented<boolean>(this, 535, 515, {
      options: onOff(),
      value: math.brackets,
      width: 200,
      height: 48,
      fontSize: 18,
      onChange: (v) => {
        math.brackets = v;
        changed();
      },
    });
    label(L, 578, 'settings.order');
    this.orderControl = new Segmented<ProblemOrder>(this, 485, 578, {
      options: (['random', 'inOrder'] as const).map((v) => ({ value: v, label: t(`settings.order.${v}`) })),
      value: math.order,
      width: 300,
      height: 48,
      fontSize: 18,
      onChange: (v) => {
        math.order = v;
        changed();
      },
    });
    this.orderHint = this.add
      .text(485, 614, t('settings.inOrderHint'), textStyle(15, COLORS.textDim, '500'))
      .setOrigin(0.5, 0.5);
    label(L, 660, 'settings.adaptive');
    new Segmented<boolean>(this, 535, 660, {
      options: onOff(),
      value: math.adaptive,
      width: 200,
      height: 48,
      fontSize: 18,
      onChange: (v) => {
        math.adaptive = v;
        changed();
      },
    });

    // ------------------------------------------------------------ game column
    const R = 700;
    const RC = 1070;
    header(R, 105, 'settings.game');
    label(R, 160, 'settings.answerMode');
    new Segmented<AnswerMode>(this, RC, 160, {
      options: [
        { value: 'typing', label: t('settings.mode.typing') },
        { value: 'choice', label: t('settings.mode.choice') },
      ],
      value: game.answerMode,
      width: 330,
      height: 50,
      fontSize: 18,
      onChange: (v) => {
        game.answerMode = v;
        changed();
      },
    });
    label(R, 225, 'settings.numpad');
    new Segmented<NumpadMode>(this, RC, 225, {
      options: [
        { value: 'auto', label: t('settings.numpad.auto') },
        { value: 'on', label: t('common.on') },
        { value: 'off', label: t('common.off') },
      ],
      value: game.numpad,
      width: 330,
      height: 50,
      fontSize: 18,
      onChange: (v) => {
        game.numpad = v;
        changed();
      },
    });
    label(R, 290, 'settings.timer');
    new Segmented<boolean>(this, RC + 65, 290, {
      options: onOff(),
      value: game.timerEnabled,
      width: 200,
      height: 50,
      fontSize: 18,
      onChange: (v) => {
        game.timerEnabled = v;
        changed();
      },
    });
    label(R + 30, 352, 'settings.timerSeconds');
    this.secondsControl = new Segmented<number>(this, RC + 40, 395, {
      options: TIMER_OPTIONS.map((s) => ({ value: s, label: `${s}` })),
      value: game.timerSeconds,
      width: 300,
      height: 46,
      fontSize: 18,
      gap: 6,
      onChange: (v) => {
        game.timerSeconds = v;
        changed();
      },
    });
    label(R, 460, 'settings.difficulty');
    new Segmented<Difficulty>(this, RC, 460, {
      options: (['easy', 'normal', 'hard'] as const).map((v) => ({ value: v, label: t(`settings.difficulty.${v}`) })),
      value: game.difficulty,
      width: 330,
      height: 50,
      fontSize: 17,
      onChange: (v) => {
        game.difficulty = v;
        changed();
      },
    });
    label(R, 525, 'settings.language');
    new Segmented<Language>(this, RC + 65, 525, {
      options: LANGUAGES.map((l) => ({ value: l, label: l === 'nl' ? 'Nederlands' : 'English' })),
      value: profile.language,
      width: 260,
      height: 50,
      fontSize: 18,
      onChange: (lang) => {
        profile.language = lang;
        saveProfile(profile);
        setLanguage(lang);
        this.scene.restart({ from: this.from });
      },
    });

    if (this.from === 'menu') {
      new HoldButton(this, RC - 20, 620, {
        width: 280,
        height: 56,
        label: t('settings.resetProgress'),
        color: COLORS.red,
        fontSize: 20,
        onClick: async () => {
          const ok = await confirmDialog(this, t('settings.resetConfirm', { name: profile.name }), {
            danger: true,
          });
          if (!ok) return;
          profile.progress = emptyProgress();
          profile.highScore = 0;
          profile.bestWave = 0;
          saveProfile(profile);
        },
      });
      this.add.text(RC - 20, 662, t('common.holdToConfirm'), textStyle(15, COLORS.textDim, '500')).setOrigin(0.5);
    } else {
      this.add.text(RC - 20, 620, t('settings.appliesNext'), textStyle(18, COLORS.textDim, '500')).setOrigin(0.5);
    }

    this.warning = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT - 16, t('settings.needCategory'), textStyle(20, COLORS.red, '600'))
      .setOrigin(0.5, 1);

    this.input.keyboard?.on('keydown-ESC', () => void this.close());
    this.refresh();
  }

  /** Enable/disable controls that depend on other settings. */
  private refresh(): void {
    const profile = requireProfile();
    const math = profile.math;
    const custom = math.categories.includes('customTables');
    this.customTableButtons.forEach((b) => b.setEnabled(custom));
    this.bracketsControl.setEnabled(math.mixedOperations);
    const inOrderOk = canUseInOrder(math);
    this.orderControl.setEnabled(inOrderOk);
    this.orderControl.setValue(inOrderOk ? math.order : 'random');
    this.orderHint.setVisible(!inOrderOk);
    this.secondsControl.setEnabled(profile.game.timerEnabled);
    this.warning.setVisible(!isValidSelection(math));
  }

  private async close(): Promise<void> {
    const profile = requireProfile();
    if (!isValidSelection(profile.math)) {
      await alertDialog(this, t('settings.needCategory'));
      return;
    }
    saveProfile(profile);
    if (this.from === 'pause') {
      this.game.events.emit(SETTINGS_CHANGED);
      this.scene.stop();
      this.scene.wake('Pause');
    } else {
      this.scene.start('Menu');
    }
  }
}
