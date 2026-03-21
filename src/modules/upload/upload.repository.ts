import { deleteImage, listImages, uploadImage } from "@/lib/uploadStorage";

export async function uploadImageRecord(input: { buffer: Buffer; mimeType: string; folder?: string }) {
  return uploadImage(input);
}

export async function deleteImageRecord(input: { key?: string; url?: string }) {
  return deleteImage(input);
}

export async function listImageRecords(input: { folder?: string; limit?: number }) {
  return listImages(input);
}
