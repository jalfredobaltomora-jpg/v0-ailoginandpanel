export async function removeBackground(imageBase64: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) { resolve(imageBase64); return; }

      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;

      const bg = sampleBackground(data, canvas.width, canvas.height);

      for (let i = 0; i < data.length; i += 4) {
        const r = data[i], g = data[i + 1], b = data[i + 2];
        const dist = Math.sqrt(
          (r - bg.r) ** 2 + (g - bg.g) ** 2 + (b - bg.b) ** 2
        );
        const threshold = 80;
        if (dist < threshold) {
          data[i + 3] = 0;
        } else if (dist < threshold + 40) {
          const alpha = Math.round(((dist - threshold) / 40) * 255);
          data[i + 3] = alpha;
        }
      }

      ctx.putImageData(imageData, 0, 0);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => resolve(imageBase64);
    img.src = imageBase64;
  });
}

function sampleBackground(data: Uint8ClampedArray, w: number, h: number) {
  const corners = [
    getPixel(data, w, 0, 0),
    getPixel(data, w, w - 1, 0),
    getPixel(data, w, 0, h - 1),
    getPixel(data, w, w - 1, h - 1),
    getPixel(data, w, Math.floor(w / 2), 0),
    getPixel(data, w, Math.floor(w / 2), h - 1),
    getPixel(data, w, 0, Math.floor(h / 2)),
    getPixel(data, w, w - 1, Math.floor(h / 2)),
  ];
  const avg = { r: 0, g: 0, b: 0 };
  corners.forEach(c => { avg.r += c.r; avg.g += c.g; avg.b += c.b; });
  avg.r = Math.round(avg.r / corners.length);
  avg.g = Math.round(avg.g / corners.length);
  avg.b = Math.round(avg.b / corners.length);
  return avg;
}

function getPixel(data: Uint8ClampedArray, w: number, x: number, y: number) {
  const i = (y * w + x) * 4;
  return { r: data[i], g: data[i + 1], b: data[i + 2] };
}
