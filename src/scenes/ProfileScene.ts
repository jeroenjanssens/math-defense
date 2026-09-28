import Phaser from 'phaser';
import { getLanguage, LANGUAGES, t, type Language } from '../i18n/i18n';
import { AVATAR_COLORS, AVATAR_SHAPES, createProfile, type Avatar, type Profile } from '../profiles/profile';
import { profileStore } from '../profiles/profileStore';
import { clearProfile, playAsGuest, selectProfile, setDeviceLanguage } from '../state/session';
import { drawAvatar } from '../ui/avatar';
import { drawBackground } from '../ui/background';
import { Button, Segmented } from '../ui/Button';
import { alertDialog, confirmDialog, Overlay } from '../ui/Dialog';
import { addFullscreenButton } from '../ui/FullscreenButton';
import { HtmlInput } from '../ui/HtmlInput';
import { COLORS, GAME_HEIGHT, GAME_WIDTH, setupCamera, shade, textStyle } from '../ui/theme';

const CARD_W = 210;
const CARD_H = 190;
const PER_ROW = 5;

/** "Who's playing?": pick, create, edit, delete, export and import players. */
export class ProfileScene extends Phaser.Scene {
  constructor() {
    super('Profiles');
  }

  create(): void {
    setupCamera(this);
    clearProfile();
    drawBackground(this);

    this.add.text(GAME_WIDTH / 2, 70, t('app.title'), textStyle(72, COLORS.yellow, '700', { stroke: '#0b1026', strokeThickness: 8 })).setOrigin(0.5);
    this.add.text(GAME_WIDTH / 2, 128, t('app.subtitle'), textStyle(24, COLORS.textDim, '500')).setOrigin(0.5);
    this.add.text(GAME_WIDTH / 2, 190, t('profiles.title'), textStyle(36, COLORS.text, '600')).setOrigin(0.5);

    // Same corner as on the menu; the language switch sits just left of it.
    const fullscreen = addFullscreenButton(this, GAME_WIDTH - 44, 44);
    new Segmented<Language>(this, fullscreen ? GAME_WIDTH - 167 : GAME_WIDTH - 110, 44, {
      options: LANGUAGES.map((l) => ({ value: l, label: l.toUpperCase() })),
      value: getLanguage(),
      width: 170,
      height: 50,
      onChange: (lang) => {
        setDeviceLanguage(lang);
        this.scene.restart();
      },
    });

    this.drawCards();

    new Button(this, 110, GAME_HEIGHT - 44, {
      width: 180,
      height: 54,
      label: t('profiles.export'),
      icon: 'download',
      color: COLORS.panelLight,
      fontSize: 20,
      onClick: () => this.exportProfiles(),
    }).setEnabled(profileStore().profiles.length > 0);
    new Button(this, 305, GAME_HEIGHT - 44, {
      width: 180,
      height: 54,
      label: t('profiles.import'),
      icon: 'upload',
      color: COLORS.panelLight,
      fontSize: 20,
      onClick: () => void this.importProfiles(),
    });
    new Button(this, GAME_WIDTH - 150, GAME_HEIGHT - 44, {
      width: 260,
      height: 54,
      label: t('profiles.guest'),
      icon: 'play',
      iconSize: 20,
      color: COLORS.grey,
      fontSize: 20,
      onClick: () => {
        playAsGuest();
        this.scene.start('Menu');
      },
    });
  }

  private drawCards(): void {
    const store = profileStore();
    const profiles = [...store.profiles];
    const slots = profiles.length + (store.isFull ? 0 : 1);
    const rows = Math.ceil(slots / PER_ROW);
    const gap = 24;
    for (let i = 0; i < slots; i++) {
      const row = Math.floor(i / PER_ROW);
      const inRow = Math.min(PER_ROW, slots - row * PER_ROW);
      const col = i % PER_ROW;
      const x = GAME_WIDTH / 2 + (col - (inRow - 1) / 2) * (CARD_W + gap);
      const y = (rows === 1 ? 390 : 320) + row * (CARD_H + gap);
      const profile = profiles[i];
      if (profile) this.profileCard(x, y, profile, i);
      else this.newCard(x, y);
    }
  }

  private cardBackground(x: number, y: number, color: number): Phaser.GameObjects.Container {
    const card = this.add.container(x, y);
    const g = this.add.graphics();
    g.fillStyle(shade(color, -0.55), 1);
    g.fillRoundedRect(-CARD_W / 2, -CARD_H / 2 + 6, CARD_W, CARD_H, 22);
    g.fillStyle(COLORS.panel, 1);
    g.fillRoundedRect(-CARD_W / 2, -CARD_H / 2, CARD_W, CARD_H, 22);
    g.lineStyle(4, color, 1);
    g.strokeRoundedRect(-CARD_W / 2, -CARD_H / 2, CARD_W, CARD_H, 22);
    card.add(g);
    card.setSize(CARD_W, CARD_H).setInteractive({ useHandCursor: true });
    card.on('pointerover', () => card.setScale(1.04));
    card.on('pointerout', () => card.setScale(1));
    return card;
  }

  private profileCard(x: number, y: number, profile: Profile, index: number): void {
    const card = this.cardBackground(x, y, profile.avatar.color);
    const avatar = this.add.graphics();
    drawAvatar(avatar, profile.avatar, 44, 0, -22);
    const name = this.add.text(0, 58, profile.name, textStyle(28, COLORS.text, '600')).setOrigin(0.5);
    if (name.width > CARD_W - 20) name.setScale((CARD_W - 20) / name.width);
    card.add([avatar, name]);
    card.on('pointerup', () => {
      selectProfile(profile.id);
      this.scene.start('Menu');
    });
    this.tweens.add({ targets: avatar, y: -6, duration: 1200 + index * 90, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    const edit = new Button(this, x + CARD_W / 2 - 26, y - CARD_H / 2 + 26, {
      width: 44,
      height: 44,
      icon: 'pencil',
      iconSize: 22,
      color: COLORS.panelLight,
      onClick: () => this.openEditor(profile),
    });
    edit.setDepth(1);
  }

  private newCard(x: number, y: number): void {
    const card = this.cardBackground(x, y, COLORS.panelBorder);
    const plus = this.add.graphics();
    plus.fillStyle(COLORS.green, 1);
    plus.fillCircle(0, -22, 42);
    plus.fillStyle(0xffffff, 1);
    plus.fillRoundedRect(-22, -27, 44, 10, 4);
    plus.fillRoundedRect(-5, -44, 10, 44, 4);
    const label = this.add.text(0, 58, t('profiles.new'), textStyle(24, COLORS.text, '600')).setOrigin(0.5);
    card.add([plus, label]);
    card.on('pointerup', () => this.openEditor());
  }

  /** Create a new player, or edit (and delete) an existing one. */
  private openEditor(existing?: Profile): void {
    const overlay = new Overlay(this, 760, 560);
    const cx = GAME_WIDTH / 2;
    const top = GAME_HEIGHT / 2 - 280;
    let avatar: Avatar = existing
      ? { ...existing.avatar }
      : { shape: Phaser.Utils.Array.GetRandom([...AVATAR_SHAPES]), color: Phaser.Utils.Array.GetRandom([...AVATAR_COLORS]) };

    const preview = this.add.graphics();
    overlay.add(preview);
    const redrawPreview = () => {
      preview.clear();
      drawAvatar(preview, avatar, 46, cx, top + 80);
    };
    redrawPreview();

    overlay.add(this.add.text(cx, top + 150, t('profiles.name'), textStyle(22, COLORS.textDim, '500')).setOrigin(0.5));
    const input = new HtmlInput(this, cx, top + 200, 420, 64, {
      value: existing?.name ?? '',
      placeholder: t('profiles.namePlaceholder'),
      onEnter: () => save(),
    });
    this.time.delayedCall(50, () => input.focus());

    overlay.add(this.add.text(cx, top + 262, t('profiles.avatar'), textStyle(22, COLORS.textDim, '500')).setOrigin(0.5));
    const shapeButtons: Button[] = [];
    AVATAR_SHAPES.forEach((shape, i) => {
      const bx = cx + (i - (AVATAR_SHAPES.length - 1) / 2) * 76;
      const b = new Button(this, bx, top + 310, {
        width: 64,
        height: 64,
        color: COLORS.panelLight,
        onClick: () => {
          avatar = { ...avatar, shape };
          shapeButtons.forEach((sb, j) => sb.setHighlighted(j === i));
          redrawPreview();
        },
        outline: true,
      });
      const g = this.add.graphics();
      drawAvatar(g, { shape, color: 0xffffff }, 20);
      b.add(g);
      b.setHighlighted(shape === avatar.shape);
      shapeButtons.push(b);
      overlay.add(b);
    });
    const colorButtons: Button[] = [];
    AVATAR_COLORS.forEach((color, i) => {
      const bx = cx + (i - (AVATAR_COLORS.length - 1) / 2) * 70;
      const b = new Button(this, bx, top + 385, {
        width: 58,
        height: 58,
        radius: 29,
        color,
        onClick: () => {
          avatar = { ...avatar, color };
          colorButtons.forEach((cb, j) => cb.setScale(j === i ? 1.15 : 1));
          redrawPreview();
        },
      });
      if (color === avatar.color) b.setScale(1.15);
      colorButtons.push(b);
      overlay.add(b);
    });

    const close = () => {
      input.destroy();
      overlay.close();
    };
    const save = () => {
      const name = input.value.trim();
      if (!name) {
        input.focus();
        return;
      }
      const store = profileStore();
      if (existing) {
        store.update({ ...existing, name: name.slice(0, 16), avatar });
      } else {
        store.add(createProfile(name, avatar, getLanguage()));
      }
      close();
      this.scene.restart();
    };

    const bottom = top + 490;
    overlay.add(
      new Button(this, cx + 150, bottom, {
        width: 240,
        height: 68,
        label: existing ? t('common.save') : t('profiles.create'),
        color: COLORS.green,
        onClick: save,
      }),
    );
    overlay.add(
      new Button(this, cx - (existing ? 20 : 150), bottom, {
        width: existing ? 180 : 240,
        height: 68,
        label: t('common.cancel'),
        color: COLORS.grey,
        onClick: close,
      }),
    );
    if (existing) {
      overlay.add(
        new Button(this, cx - 250, bottom, {
          width: 200,
          height: 68,
          label: t('profiles.delete'),
          color: COLORS.red,
          fontSize: 20,
          onClick: async () => {
            input.el.style.display = 'none';
            const ok = await confirmDialog(this, t('profiles.deleteConfirm', { name: existing.name }), {
              hold: true,
              danger: true,
            });
            if (ok) {
              profileStore().remove(existing.id);
              close();
              this.scene.restart();
            } else {
              input.el.style.display = '';
            }
          },
        }),
      );
    }
  }

  private exportProfiles(): void {
    const json = profileStore().exportJson();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `math-defense-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  private async importProfiles(): Promise<void> {
    const ok = await confirmDialog(this, t('profiles.importConfirm'), { hold: true });
    if (!ok) return;
    const file = await pickFile();
    if (!file) return;
    try {
      const count = profileStore().importJson(await file.text());
      await alertDialog(this, t('profiles.importDone', { n: count }));
      this.scene.restart();
    } catch {
      await alertDialog(this, t('profiles.importFailed'));
    }
  }
}

const pickFile = (): Promise<File | null> =>
  new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json,.json';
    input.addEventListener('change', () => resolve(input.files?.[0] ?? null));
    input.addEventListener('cancel', () => resolve(null));
    input.click();
  });
