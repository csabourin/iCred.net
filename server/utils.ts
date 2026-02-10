// Base64url encoding/decoding utilities
export const base64url = {
  encode(bytes: Uint8Array): string {
    let binary = "";
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
  },
  decode(str: string): Uint8Array {
    const padded = str.replace(/-/g, "+").replace(/_/g, "/");
    const binary = atob(padded);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  },
  encodeString(str: string): string {
    return base64url.encode(new TextEncoder().encode(str));
  },
  decodeString(str: string): string {
    return new TextDecoder().decode(base64url.decode(str));
  },
};

// SHA-256 hash for IP anonymization and evidence hashing
export async function sha256Hash(input: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

// Slug generation
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// Bitstring Status List utilities
export function createEmptyBitstring(size: number = 131072): string {
  const bytes = new Uint8Array(Math.ceil(size / 8));
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export function setBitstringIndex(encoded: string, index: number, value: boolean): string {
  const binary = atob(encoded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }

  const byteIndex = Math.floor(index / 8);
  const bitIndex = index % 8;

  if (value) {
    bytes[byteIndex] |= 1 << (7 - bitIndex);
  } else {
    bytes[byteIndex] &= ~(1 << (7 - bitIndex));
  }

  let result = "";
  for (let i = 0; i < bytes.length; i++) {
    result += String.fromCharCode(bytes[i]);
  }
  return btoa(result);
}

export function getBitstringIndex(encoded: string, index: number): boolean {
  const binary = atob(encoded);
  const byteIndex = Math.floor(index / 8);
  const bitIndex = index % 8;
  const byte = binary.charCodeAt(byteIndex);
  return (byte & (1 << (7 - bitIndex))) !== 0;
}
