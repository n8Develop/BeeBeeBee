const MAGIC_BYTES = {
  png: [0x89, 0x50, 0x4E, 0x47],
  jpg: [0xFF, 0xD8, 0xFF],
  gif: [0x47, 0x49, 0x46, 0x38],
  webp: null // checked separately: RIFF....WEBP
};

export function validateImage(buffer) {
  if (!buffer || buffer.length < 12) return { valid: false, ext: null };

  const bytes = new Uint8Array(buffer);

  if (matches(bytes, MAGIC_BYTES.png)) return { valid: true, ext: 'png' };
  if (matches(bytes, MAGIC_BYTES.jpg)) return { valid: true, ext: 'jpg' };
  if (matches(bytes, MAGIC_BYTES.gif)) return { valid: true, ext: 'gif' };

  // WebP: starts with RIFF, bytes 8-11 are WEBP
  if (bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
      bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50) {
    return { valid: true, ext: 'webp' };
  }

  return { valid: false, ext: null };
}

function matches(bytes, signature) {
  return signature.every((byte, i) => bytes[i] === byte);
}
