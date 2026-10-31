import { CanvasTexture, Mesh, MeshBasicMaterial, PlaneGeometry, SRGBColorSpace } from '@iwsdk/core';

/** A text plane backed by a small canvas; redraw only when text changes. */
export class Label {
  readonly mesh: Mesh;
  private ctx: CanvasRenderingContext2D | null;
  private tex: CanvasTexture;
  private canvas: HTMLCanvasElement;
  private last = '';

  constructor(widthM: number, heightM: number, private px = 512) {
    this.canvas = document.createElement('canvas');
    this.canvas.width = px;
    this.canvas.height = Math.round((px * heightM) / widthM);
    this.ctx = this.canvas.getContext('2d');
    this.tex = new CanvasTexture(this.canvas);
    this.tex.colorSpace = SRGBColorSpace;
    this.mesh = new Mesh(
      new PlaneGeometry(widthM, heightM),
      new MeshBasicMaterial({ map: this.tex, transparent: true, depthWrite: false }),
    );
  }

  set(lines: string[], fg: string, bg: string, border?: string) {
    const key = lines.join('\n') + fg + bg + border;
    if (key === this.last || !this.ctx) return;
    this.last = key;
    const { ctx, canvas } = this;
    const W = canvas.width;
    const H = canvas.height;
    ctx.clearRect(0, 0, W, H);
    const r = H * 0.22;
    ctx.fillStyle = bg;
    ctx.beginPath();
    ctx.roundRect(2, 2, W - 4, H - 4, r);
    ctx.fill();
    if (border) {
      ctx.strokeStyle = border;
      ctx.lineWidth = Math.max(3, H * 0.05);
      ctx.stroke();
    }
    ctx.fillStyle = fg;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const size = H / (lines.length + 0.5);
    lines.forEach((t, i) => {
      let px = Math.round(i === 0 ? size : size * 0.72);
      ctx.font = `${i === 0 ? 700 : 500} ${px}px system-ui, sans-serif`;
      const fit = (W * 0.9) / Math.max(1, ctx.measureText(t).width);
      if (fit < 1) {
        px = Math.floor(px * fit);
        ctx.font = `${i === 0 ? 700 : 500} ${px}px system-ui, sans-serif`;
      }
      ctx.fillText(t, W / 2, (H * (i + 1)) / (lines.length + 1));
    });
    this.tex.needsUpdate = true;
  }
}
