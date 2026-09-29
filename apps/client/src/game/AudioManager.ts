import type { PlayerId } from "./LocalMatchTypes.js";

type SoundName = "select" | "match" | "invalid" | "combo" | "shuffle" | "freeze" | "block" | "add_tiles" | "start" | "end";

const NOTES: Record<SoundName, number[]> = {
  select: [520],
  match: [660, 830, 1046],
  invalid: [190, 150],
  combo: [740, 988],
  shuffle: [420, 590, 720],
  freeze: [880, 740, 520],
  block: [230, 350],
  add_tiles: [480, 620, 760],
  start: [523, 659, 784],
  end: [784, 659, 523],
};

export class AudioManager {
  private context: AudioContext | null = null;
  private masterVolume = 0.28;
  private muted = false;

  play(name: string): void {
    this.playForPlayer("P1", name);
  }

  playForPlayer(playerId: PlayerId, name: string): void {
    if (this.muted || !(name in NOTES)) return;
    try {
      const context = this.getContext();
      const notes = NOTES[name as SoundName];
      const pitch = playerId === "P1" ? 1 : 1.12;
      const startAt = context.currentTime;
      notes.forEach((frequency, index) => {
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        const at = startAt + index * 0.055;
        oscillator.type = "sine";
        oscillator.frequency.setValueAtTime(frequency * pitch, at);
        gain.gain.setValueAtTime(this.masterVolume, at);
        gain.gain.exponentialRampToValueAtTime(0.001, at + 0.14);
        oscillator.connect(gain);
        gain.connect(context.destination);
        oscillator.start(at);
        oscillator.stop(at + 0.15);
      });
    } catch {
      // Audio remains optional when browser policy or device support blocks it.
    }
  }

  setMasterVolume(volume: number): void {
    this.masterVolume = Math.max(0, Math.min(1, volume));
  }

  mute(): void {
    this.muted = true;
  }

  unmute(): void {
    this.muted = false;
  }

  get isMuted(): boolean {
    return this.muted;
  }

  destroy(): void {
    void this.context?.close();
    this.context = null;
  }

  private getContext(): AudioContext {
    if (!this.context) this.context = new AudioContext();
    if (this.context.state === "suspended") void this.context.resume();
    return this.context;
  }
}