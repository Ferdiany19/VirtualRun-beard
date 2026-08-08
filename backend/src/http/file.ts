export type UploadedMemoryFile = {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
};

export function fileToWebFile(
  file: UploadedMemoryFile | undefined,
): File | null {
  if (!file) {
    return null;
  }

  return new File([new Uint8Array(file.buffer)], file.originalname, {
    type: file.mimetype,
  });
}
