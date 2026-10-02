import jsQR from "jsqr";

/** Large photos are scaled down first; QR codes stay readable and decoding stays fast. */
const MAX_DIMENSION = 1600;

/** Reads the text of the QR code in an image file, in the browser. */
export async function decodeQrImage(file: File) {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(
    1,
    MAX_DIMENSION / Math.max(bitmap.width, bitmap.height),
  );
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) {
    bitmap.close();
    throw new Error("Browser tidak dapat membaca gambar.");
  }
  // White under transparent PNGs so dark modules stay dark.
  context.fillStyle = "#fff";
  context.fillRect(0, 0, width, height);
  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const image = context.getImageData(0, 0, width, height);
  const result = jsQR(image.data, width, height, {
    inversionAttempts: "attemptBoth",
  });
  if (!result?.data) {
    throw new Error(
      "Kode QR tidak terbaca. Gunakan gambar QRIS yang jelas dan tidak terpotong.",
    );
  }
  return result.data;
}
