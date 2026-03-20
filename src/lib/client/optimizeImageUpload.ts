"use client";

const DEFAULT_MAX_UPLOAD_MB = 6;
const DEFAULT_MAX_UPLOAD_BYTES = DEFAULT_MAX_UPLOAD_MB * 1024 * 1024;
const DEFAULT_MAX_DIMENSION = 2560;
const COMPRESSIBLE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const QUALITY_STEPS = [0.88, 0.8, 0.72, 0.64, 0.56];
const SCALE_STEPS = [1, 0.9, 0.8, 0.7, 0.6];

type OptimizeUploadOptions = {
  targetBytes?: number;
  maxDimension?: number;
};

function resolveClientUploadLimitBytes(): number {
  const rawValue = Number(process.env.NEXT_PUBLIC_UPLOAD_MAX_FILE_SIZE_MB ?? DEFAULT_MAX_UPLOAD_MB);
  if (!Number.isFinite(rawValue) || rawValue <= 0) {
    return DEFAULT_MAX_UPLOAD_BYTES;
  }
  const clampedMb = Math.min(40, Math.max(1, rawValue));
  return Math.floor(clampedMb * 1024 * 1024);
}

function replaceExtension(fileName: string, extension: string): string {
  const dotIndex = fileName.lastIndexOf(".");
  if (dotIndex <= 0) {
    return `${fileName}${extension}`;
  }
  return `${fileName.slice(0, dotIndex)}${extension}`;
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("image load failed"));
    };
    image.src = objectUrl;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), "image/webp", quality);
  });
}

export async function optimizeImageForUpload(file: File, options: OptimizeUploadOptions = {}): Promise<File> {
  const targetBytes = options.targetBytes ?? resolveClientUploadLimitBytes();
  if (file.size <= targetBytes) {
    return file;
  }

  if (!COMPRESSIBLE_TYPES.has(file.type) || typeof window === "undefined") {
    return file;
  }

  try {
    const image = await loadImage(file);
    const naturalWidth = image.naturalWidth;
    const naturalHeight = image.naturalHeight;
    if (!Number.isFinite(naturalWidth) || !Number.isFinite(naturalHeight) || naturalWidth < 1 || naturalHeight < 1) {
      return file;
    }

    const maxDimension = options.maxDimension ?? DEFAULT_MAX_DIMENSION;
    const baseScale = Math.min(1, maxDimension / Math.max(naturalWidth, naturalHeight));
    let smallestBlob: Blob | null = null;

    for (const scaleRatio of SCALE_STEPS) {
      const width = Math.max(1, Math.round(naturalWidth * baseScale * scaleRatio));
      const height = Math.max(1, Math.round(naturalHeight * baseScale * scaleRatio));
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext("2d");
      if (!context) {
        continue;
      }
      context.drawImage(image, 0, 0, width, height);

      for (const quality of QUALITY_STEPS) {
        const blob = await canvasToBlob(canvas, quality);
        if (!blob) {
          continue;
        }
        if (!smallestBlob || blob.size < smallestBlob.size) {
          smallestBlob = blob;
        }
        if (blob.size <= targetBytes) {
          return new File([blob], replaceExtension(file.name, ".webp"), {
            type: "image/webp",
            lastModified: file.lastModified,
          });
        }
      }
    }

    if (smallestBlob && smallestBlob.size < file.size) {
      return new File([smallestBlob], replaceExtension(file.name, ".webp"), {
        type: "image/webp",
        lastModified: file.lastModified,
      });
    }
  } catch {
    return file;
  }

  return file;
}
