/**
 * Person segmentation using MediaPipe ImageSegmenter.
 * Runs entirely client-side via WebGL (no server needed).
 */

let segmenterInstance: any = null;
let loadingPromise: Promise<any> | null = null;

async function loadSegmenter() {
  if (segmenterInstance) return segmenterInstance;
  if (loadingPromise) return loadingPromise;

  loadingPromise = (async () => {
    const { ImageSegmenter, FilesetResolver } = await import('@mediapipe/tasks-vision');
    const vision = await FilesetResolver.forVisionTasks(
      'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm'
    );
    segmenterInstance = await ImageSegmenter.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath:
          'https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_segmenter/float16/latest/selfie_segmenter.tflite',
        delegate: 'GPU',
      },
      runningMode: 'IMAGE',
      outputCategoryMask: true,
    });
    return segmenterInstance;
  })();

  return loadingPromise;
}

/**
 * Returns an HTMLCanvasElement with the person segmentation mask.
 * Person pixels = white (255), background = transparent (0).
 * The mask has the same dimensions as the source image.
 */
export async function getPersonMask(image: HTMLImageElement): Promise<HTMLCanvasElement> {
  const segmenter = await loadSegmenter();

  // Run segmentation
  const result = segmenter.segment(image);

  if (!result.categoryMask) {
    throw new Error('No category mask returned from segmenter');
  }

  const mask = result.categoryMask;
  const w = mask.width;
  const h = mask.height;
  const data = mask.getAsFloat32Array();

  // Build output canvas
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  const imageData = ctx.createImageData(w, h);
  const pixels = imageData.data;

  // MediaPipe returns 0 = background, 1 = person
  for (let i = 0; i < data.length; i++) {
    const idx = i * 4;
    const isPerson = data[i] > 0.5;
    pixels[idx] = 255;     // R
    pixels[idx + 1] = 255; // G
    pixels[idx + 2] = 255; // B
    pixels[idx + 3] = isPerson ? 255 : 0; // A
  }

  ctx.putImageData(imageData, 0, 0);
  return canvas;
}

/**
 * Releases the segmenter model to free memory.
 */
export function disposeSegmenter() {
  if (segmenterInstance) {
    try { segmenterInstance.close(); } catch {}
    segmenterInstance = null;
    loadingPromise = null;
  }
}
