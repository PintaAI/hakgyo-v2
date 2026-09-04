import {
  MAX_ORGANIZATION_LOGO_SIZE,
  organizationLogoContentTypes,
  type OrganizationLogoContentType,
} from "~/lib/organization-logo";
import { hasImageSignature } from "~/lib/image-signature";

export const MAX_ORGANIZATION_LOGO_DIMENSION = 1024;

const webpContentType = "image/webp" satisfies OrganizationLogoContentType;
const outputQualities = [0.86, 0.72, 0.58, 0.45];

type DecodedImage = {
  source: CanvasImageSource;
  width: number;
  height: number;
  close: () => void;
};

async function decodeImage(file: File): Promise<DecodedImage> {
  if (typeof createImageBitmap === "function") {
    try {
      const bitmap = await createImageBitmap(file, {
        imageOrientation: "from-image",
      });
      return {
        source: bitmap,
        width: bitmap.width,
        height: bitmap.height,
        close: () => bitmap.close(),
      };
    } catch {
      // Fall through to the image element decoder for browsers with limited
      // createImageBitmap support.
    }
  }

  const objectUrl = URL.createObjectURL(file);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const element = new Image();
      element.onload = () => resolve(element);
      element.onerror = () => reject(new Error("IMAGE_DECODE_FAILED"));
      element.src = objectUrl;
    });

    return {
      source: image,
      width: image.naturalWidth,
      height: image.naturalHeight,
      close: () => URL.revokeObjectURL(objectUrl),
    };
  } catch (error) {
    URL.revokeObjectURL(objectUrl);
    throw error;
  }
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  contentType: string,
  quality?: number,
) {
  return new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, contentType, quality);
  });
}

type EncodedImage = {
  blob: Blob;
  contentType: OrganizationLogoContentType;
};

async function encodeImage(
  canvas: HTMLCanvasElement,
): Promise<EncodedImage | null> {
  for (const quality of outputQualities) {
    const blob = await canvasToBlob(canvas, webpContentType, quality);
    if (blob) return { blob, contentType: webpContentType };
  }

  const blob = await canvasToBlob(canvas, "image/png");
  return blob ? { blob, contentType: "image/png" } : null;
}

function outputFileName(fileName: string, contentType: string) {
  const stem = fileName.replace(/\.[^/.]+$/, "") || "organization-logo";
  const extension = contentType === "image/png" ? "png" : "webp";
  return `${stem}.${extension}`;
}

export async function processOrganizationLogo(file: File) {
  if (file.size <= 0 || file.size > MAX_ORGANIZATION_LOGO_SIZE) {
    throw new Error("Logo organisasi maksimal 5 MB.");
  }

  if (
    !organizationLogoContentTypes.includes(
      file.type as OrganizationLogoContentType,
    )
  ) {
    throw new Error("Gunakan gambar JPEG, PNG, WebP, atau GIF.");
  }

  const header = new Uint8Array(await file.slice(0, 16).arrayBuffer());
  if (!hasImageSignature(header, file.type)) {
    throw new Error("File yang dipilih bukan gambar yang valid.");
  }

  // Canvas only renders the first frame of an animated GIF. Keep GIFs as-is
  // so uploading a logo never silently removes its animation.
  if (file.type === "image/gif") return file;

  const decoded = await decodeImage(file).catch(() => {
    throw new Error("File yang dipilih tidak dapat dibaca sebagai gambar.");
  });

  try {
    if (
      !Number.isFinite(decoded.width) ||
      !Number.isFinite(decoded.height) ||
      decoded.width <= 0 ||
      decoded.height <= 0
    ) {
      throw new Error("Ukuran gambar tidak valid.");
    }

    const scale = Math.min(
      1,
      MAX_ORGANIZATION_LOGO_DIMENSION / Math.max(decoded.width, decoded.height),
    );
    const width = Math.max(1, Math.round(decoded.width * scale));
    const height = Math.max(1, Math.round(decoded.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("Gambar gagal diproses. Silakan pilih gambar lain.");
    }
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";
    context.drawImage(decoded.source, 0, 0, width, height);

    let encoded = await encodeImage(canvas);
    if (!encoded) {
      throw new Error("Gambar gagal diproses. Silakan pilih gambar lain.");
    }

    // Extremely detailed images can still exceed the upload limit after the
    // first encode. Reduce the dimensions before giving up on the upload.
    let currentCanvas = canvas;
    while (
      encoded.blob.size > MAX_ORGANIZATION_LOGO_SIZE &&
      currentCanvas.width > 1
    ) {
      const nextCanvas = document.createElement("canvas");
      nextCanvas.width = Math.max(1, Math.round(currentCanvas.width * 0.75));
      nextCanvas.height = Math.max(1, Math.round(currentCanvas.height * 0.75));
      const nextContext = nextCanvas.getContext("2d");
      if (!nextContext) {
        throw new Error("Gambar gagal diproses. Silakan pilih gambar lain.");
      }
      nextContext.imageSmoothingEnabled = true;
      nextContext.imageSmoothingQuality = "high";
      nextContext.drawImage(
        currentCanvas,
        0,
        0,
        nextCanvas.width,
        nextCanvas.height,
      );
      currentCanvas = nextCanvas;
      encoded = (await encodeImage(currentCanvas)) ?? encoded;
    }

    if (encoded.blob.size > MAX_ORGANIZATION_LOGO_SIZE) {
      throw new Error("Logo organisasi terlalu besar setelah diproses.");
    }

    return new File(
      [encoded.blob],
      outputFileName(file.name, encoded.contentType),
      {
        type: encoded.contentType,
        lastModified: file.lastModified,
      },
    );
  } finally {
    decoded.close();
  }
}
