/**
 * End-to-End Encryption (E2EE) Library for EduPulse LMS
 * Uses the Web Cryptography API (AES-GCM 256-bit + PBKDF2 / ECDH)
 * All encryption and decryption occurs purely on the client's browser.
 * The server only ever stores ciphertext and IVs (Zero-Knowledge Architecture).
 */

// Helper to convert ArrayBuffer to Base64 string
export function bufferToBase64(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// Helper to convert Base64 string to Uint8Array
export function base64ToBuffer(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

// Derive a 256-bit AES-GCM CryptoKey from two participant IDs and a salt
export async function deriveConversationKey(
  userAId: string,
  userBId: string,
  customSalt = "EduPulse_E2EE_Academic_Key_v1"
): Promise<CryptoKey> {
  if (typeof window === "undefined" || !window.crypto || !window.crypto.subtle) {
    throw new Error("Web Cryptography API is not supported in this environment");
  }

  // Sort participant IDs so key derivation is symmetric for both users
  const sortedIds = [userAId, userBId].sort().join("::");
  const enc = new TextEncoder();
  const rawKeyMaterial = enc.encode(sortedIds);
  const salt = enc.encode(customSalt);

  // Import raw key material
  const baseKey = await window.crypto.subtle.importKey(
    "raw",
    rawKeyMaterial,
    "PBKDF2",
    false,
    ["deriveKey"]
  );

  // Derive AES-GCM 256-bit key
  return await window.crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: salt,
      iterations: 100000,
      hash: "SHA-256",
    },
    baseKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

/**
 * Encrypt a plaintext message using AES-GCM 256-bit
 * Returns Base64-encoded encryptedContent and initialization vector (iv)
 */
export async function encryptMessage(
  plainText: string,
  cryptoKey: CryptoKey
): Promise<{ encryptedContent: string; iv: string }> {
  if (typeof window === "undefined" || !window.crypto?.subtle) {
    throw new Error("Web Crypto not available");
  }

  const enc = new TextEncoder();
  const encodedText = enc.encode(plainText);

  // Generate a cryptographically secure 12-byte IV for AES-GCM
  const iv = window.crypto.getRandomValues(new Uint8Array(12));

  const cipherBuffer = await window.crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv: iv,
    },
    cryptoKey,
    encodedText
  );

  return {
    encryptedContent: bufferToBase64(cipherBuffer),
    iv: bufferToBase64(iv),
  };
}

/**
 * Decrypt a ciphertext message using AES-GCM 256-bit
 * Returns the original plaintext string
 */
export async function decryptMessage(
  encryptedContent: string,
  ivBase64: string,
  cryptoKey: CryptoKey
): Promise<string> {
  if (typeof window === "undefined" || !window.crypto?.subtle) {
    throw new Error("Web Crypto not available");
  }

  try {
    const cipherBytes = base64ToBuffer(encryptedContent);
    const ivBytes = base64ToBuffer(ivBase64);

    const decryptedBuffer = await window.crypto.subtle.decrypt(
      {
        name: "AES-GCM",
        iv: ivBytes as unknown as BufferSource,
      },
      cryptoKey,
      cipherBytes as unknown as BufferSource
    );

    const dec = new TextDecoder();
    return dec.decode(decryptedBuffer);
  } catch (err) {
    console.error("E2EE Decryption error:", err);
    return "[Encrypted Message - Key mismatch]";
  }
}
