import * as THREE from "three";

/** 等距柱状贴图尺寸（2:1，正好铺满球面） */
export const TEXTURE_WIDTH = 1024;
export const TEXTURE_HEIGHT = 512;

type Blob = { x: number; y: number; rx: number; ry: number; rot: number };
type Crater = { x: number; y: number; r: number };

/** 水彩陆块：位置避开两极，形状靠叠加椭圆晕开 */
const continents: Blob[] = [
  { x: 170, y: 210, rx: 148, ry: 118, rot: -0.18 },
  { x: 214, y: 372, rx: 112, ry: 88, rot: 0.12 },
  { x: 352, y: 246, rx: 98, ry: 76, rot: 0.26 },
  { x: 596, y: 168, rx: 128, ry: 96, rot: -0.1 },
  { x: 690, y: 352, rx: 150, ry: 108, rot: 0.2 },
  { x: 878, y: 240, rx: 92, ry: 70, rot: -0.24 },
  { x: 962, y: 118, rx: 70, ry: 52, rot: 0.1 },
];

const craters: Crater[] = [
  { x: 150, y: 196, r: 56 },
  { x: 332, y: 128, r: 32 },
  { x: 512, y: 300, r: 62 },
  { x: 258, y: 382, r: 26 },
  { x: 700, y: 408, r: 44 },
  { x: 872, y: 214, r: 34 },
];

const clouds: Blob[] = [
  { x: 96, y: 148, rx: 78, ry: 22, rot: -0.12 },
  { x: 300, y: 210, rx: 62, ry: 18, rot: 0.1 },
  { x: 520, y: 132, rx: 84, ry: 22, rot: -0.06 },
  { x: 430, y: 380, rx: 76, ry: 20, rot: 0.12 },
  { x: 760, y: 268, rx: 66, ry: 18, rot: -0.14 },
  { x: 930, y: 348, rx: 58, ry: 16, rot: 0.08 },
  { x: 660, y: 476, rx: 72, ry: 18, rot: -0.08 },
];

function makeCanvas() {
  const canvas = document.createElement("canvas");
  canvas.width = TEXTURE_WIDTH;
  canvas.height = TEXTURE_HEIGHT;
  return canvas;
}

/** 横向画三份，保证 0 / 1024 接缝处不断裂 */
function drawWrapped(
  ctx: CanvasRenderingContext2D,
  x: number,
  fn: (drawX: number) => void,
) {
  fn(x);
  fn(x - TEXTURE_WIDTH);
  fn(x + TEXTURE_WIDTH);
}

function drawEllipse(
  ctx: CanvasRenderingContext2D,
  blob: Blob,
  scale: number,
  color: string,
  blur: number,
) {
  ctx.save();
  ctx.filter = `blur(${blur}px)`;
  ctx.fillStyle = color;
  drawWrapped(ctx, blob.x, (drawX) => {
    ctx.beginPath();
    ctx.ellipse(
      drawX,
      blob.y,
      blob.rx * scale,
      blob.ry * scale,
      blob.rot,
      0,
      Math.PI * 2,
    );
    ctx.fill();
  });
  ctx.restore();
}

function drawCrater(ctx: CanvasRenderingContext2D, crater: Crater) {
  const { x, y, r } = crater;
  drawWrapped(ctx, x, (drawX) => {
    const fill = ctx.createRadialGradient(drawX, y, r * 0.16, drawX, y, r);
    fill.addColorStop(0, "rgba(150, 164, 184, 0.3)");
    fill.addColorStop(0.68, "rgba(114, 130, 154, 0.32)");
    fill.addColorStop(0.9, "rgba(78, 94, 120, 0.38)");
    fill.addColorStop(1, "rgba(78, 94, 120, 0)");
    ctx.fillStyle = fill;
    ctx.beginPath();
    ctx.arc(drawX, y, r, 0, Math.PI * 2);
    ctx.fill();

    ctx.save();
    ctx.filter = "blur(1.5px)";
    ctx.strokeStyle = "rgba(246, 251, 255, 0.5)";
    ctx.lineWidth = Math.max(1.5, r * 0.075);
    ctx.beginPath();
    ctx.arc(drawX, y, r * 0.86, Math.PI * 1.02, Math.PI * 1.62);
    ctx.stroke();
    ctx.restore();
  });
}

function drawCloud(ctx: CanvasRenderingContext2D, blob: Blob) {
  drawEllipse(ctx, blob, 1, "rgba(255, 255, 255, 0.36)", 7);
}

function drawPolarCaps(ctx: CanvasRenderingContext2D) {
  const top = ctx.createLinearGradient(0, 0, 0, 110);
  top.addColorStop(0, "rgba(251, 253, 255, 0.9)");
  top.addColorStop(1, "rgba(251, 253, 255, 0)");
  ctx.fillStyle = top;
  ctx.fillRect(0, 0, TEXTURE_WIDTH, 110);

  const bottom = ctx.createLinearGradient(0, TEXTURE_HEIGHT, 0, TEXTURE_HEIGHT - 96);
  bottom.addColorStop(0, "rgba(246, 250, 255, 0.78)");
  bottom.addColorStop(1, "rgba(246, 250, 255, 0)");
  ctx.fillStyle = bottom;
  ctx.fillRect(0, TEXTURE_HEIGHT - 96, TEXTURE_WIDTH, 96);
}

/** 颜色的水彩球面贴图 */
function paintColor() {
  const canvas = makeCanvas();
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;

  const base = ctx.createLinearGradient(0, 0, 0, TEXTURE_HEIGHT);
  base.addColorStop(0, "#dfe7f1");
  base.addColorStop(0.34, "#c9d4e2");
  base.addColorStop(0.68, "#b0bccd");
  base.addColorStop(1, "#9dabbf");
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, TEXTURE_WIDTH, TEXTURE_HEIGHT);

  // 远处晕开的水色
  continents.forEach((blob) => drawEllipse(ctx, blob, 1.14, "rgba(124, 142, 168, 0.3)", 24));
  // 陆块主体
  continents.forEach((blob) => drawEllipse(ctx, blob, 1, "rgba(99, 117, 145, 0.46)", 10));
  // 受光的浅色碎块
  continents.forEach((blob) => drawEllipse(ctx, blob, 0.86, "rgba(150, 165, 186, 0.42)", 6));
  // 深色暗礁，压出层次
  continents.slice(0, 5).forEach((blob) =>
    drawEllipse(
      ctx,
      { ...blob, x: blob.x + 18, y: blob.y + 26, rx: blob.rx * 0.4, ry: blob.ry * 0.4 },
      1,
      "rgba(76, 92, 118, 0.34)",
      5,
    ),
  );
  // 海岸细点
  ctx.save();
  ctx.filter = "blur(1px)";
  ctx.fillStyle = "rgba(90, 108, 135, 0.32)";
  continents.forEach((blob) => {
    for (let i = 0; i < 7; i += 1) {
      const angle = (i / 7) * Math.PI * 2 + blob.rot;
      const px = blob.x + Math.cos(angle) * blob.rx * 1.06;
      const py = blob.y + Math.sin(angle) * blob.ry * 1.06;
      drawWrapped(ctx, px, (drawX) => {
        ctx.beginPath();
        ctx.arc(drawX, py, 1.6 + (i % 3), 0, Math.PI * 2);
        ctx.fill();
      });
    }
  });
  ctx.restore();

  clouds.forEach((blob) => drawCloud(ctx, blob));
  craters.forEach((crater) => drawCrater(ctx, crater));
  drawPolarCaps(ctx);

  // 极淡的纸面颗粒
  const noise = document.createElement("canvas");
  noise.width = 96;
  noise.height = 96;
  const nctx = noise.getContext("2d");
  if (nctx) {
    const data = nctx.createImageData(96, 96);
    for (let i = 0; i < data.data.length; i += 4) {
      const v = 120 + Math.random() * 70;
      data.data[i] = v;
      data.data[i + 1] = v;
      data.data[i + 2] = v;
      data.data[i + 3] = 255;
    }
    nctx.putImageData(data, 0, 0);
    const pattern = ctx.createPattern(noise, "repeat");
    if (pattern) {
      ctx.save();
      ctx.globalAlpha = 0.08;
      ctx.globalCompositeOperation = "multiply";
      ctx.fillStyle = pattern;
      ctx.fillRect(0, 0, TEXTURE_WIDTH, TEXTURE_HEIGHT);
      ctx.restore();
    }
  }

  return canvas;
}

/** 凹凸贴图：把坑真的做成凹陷，受光时才会有明暗过渡 */
function paintBump() {
  const canvas = makeCanvas();
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;

  ctx.fillStyle = "#808080";
  ctx.fillRect(0, 0, TEXTURE_WIDTH, TEXTURE_HEIGHT);

  craters.forEach(({ x, y, r }) => {
    drawWrapped(ctx, x, (drawX) => {
      const g = ctx.createRadialGradient(drawX, y, 0, drawX, y, r);
      g.addColorStop(0, "#5c5c5c");
      g.addColorStop(0.62, "#6e6e6e");
      g.addColorStop(0.86, "#dcdcdc");
      g.addColorStop(0.94, "#b0b0b0");
      g.addColorStop(1, "#808080");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(drawX, y, r, 0, Math.PI * 2);
      ctx.fill();
    });
  });

  return canvas;
}

export interface PlanetTextures {
  map: THREE.Texture;
  bump: THREE.Texture;
  dispose: () => void;
}

export function createPlanetTextures(): PlanetTextures {
  const map = new THREE.CanvasTexture(paintColor());
  map.colorSpace = THREE.SRGBColorSpace;
  map.wrapS = THREE.RepeatWrapping;

  const bump = new THREE.CanvasTexture(paintBump());
  bump.wrapS = THREE.RepeatWrapping;

  return {
    map,
    bump,
    dispose: () => {
      map.dispose();
      bump.dispose();
    },
  };
}
