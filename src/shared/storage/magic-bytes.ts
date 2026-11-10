/** PDF files begin with the bytes "%PDF-". */
const PDF_MAGIC = Uint8Array.from([0x25, 0x50, 0x44, 0x46, 0x2d]); // %PDF-

export const PDF_MAGIC_LENGTH = PDF_MAGIC.length;

/** True when `bytes` starts with the PDF magic number. */
export function hasPdfMagic(bytes: Uint8Array): boolean {
  if (bytes.length < PDF_MAGIC.length) return false;
  for (let i = 0; i < PDF_MAGIC.length; i++) {
    if (bytes[i] !== PDF_MAGIC[i]) return false;
  }
  return true;
}
