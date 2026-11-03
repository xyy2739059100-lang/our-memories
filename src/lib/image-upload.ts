/**
 * 把用户选的照片压小后转成 dataURL（阶段五）。
 * 原图动辄几 MB，直接存会撑爆 localStorage，所以统一缩到长边 1280 以内。
 */
export interface UploadedImage {
  src: string;
  width: number;
  height: number;
}

const MAX_EDGE = 1280;
const MAX_BYTES = 12 * 1024 * 1024;
const QUALITY = 0.86;

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("这张照片的格式浏览器打不开"));
    img.src = src;
  });
}

export async function readImageFile(file: File): Promise<UploadedImage> {
  if (!file.type.startsWith("image/")) {
    throw new Error("请选择图片文件");
  }
  if (file.size > MAX_BYTES) {
    throw new Error("照片超过 12MB，换一张小一点的吧");
  }

  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("读取照片失败了"));
    reader.readAsDataURL(file);
  });

  const img = await loadImage(dataUrl);
  const scale = Math.min(
    1,
    MAX_EDGE / Math.max(img.naturalWidth || 1, img.naturalHeight || 1),
  );
  const width = Math.max(1, Math.round(img.naturalWidth * scale));
  const height = Math.max(1, Math.round(img.naturalHeight * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("这个浏览器无法处理照片");

  // PNG / WEBP 这类可能带透明背景，直接原样输出，贴纸才不会多出一块底色
  const keepAlpha = /image\/(png|webp|gif|avif)/.test(file.type);
  if (keepAlpha) {
    ctx.drawImage(img, 0, 0, width, height);
    return { src: canvas.toDataURL("image/png"), width, height };
  }

  // 普通照片：透明 PNG 贴到纸色上，避免拍立得相框里露出黑底
  ctx.fillStyle = "#fffdf7";
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(img, 0, 0, width, height);

  return { src: canvas.toDataURL("image/jpeg", QUALITY), width, height };
}
