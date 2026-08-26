export function bufferToBase64(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export function base64ToBuffer(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export async function deriveConversationKey(
  userAId: string,
  userBId: string,
  customSalt = "EduPulse_E2EE_Academic_Key_v1"
): Promise<CryptoKey> {
  if (typeof window === "undefined" || !window.crypto || !window.crypto.subtle) {
    throw new Error("Web Cryptography API is not supported in this environment");
  }

  const sortedIds = [userAId, userBId].sort().join("::");
  const enc = new TextEncoder();
  const rawKeyMaterial = enc.encode(sortedIds);
  const salt = enc.encode(customSalt);

  const baseKey = await window.crypto.subtle.importKey(
    "raw",
    rawKeyMaterial,
    "PBKDF2",
    false,
    ["deriveKey"]
  );

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

export async function encryptMessage(
  plainText: string,
  cryptoKey: CryptoKey
): Promise<{ encryptedContent: string; iv: string }> {
  if (typeof window === "undefined" || !window.crypto?.subtle) {
    throw new Error("Web Crypto not available");
  }

  const enc = new TextEncoder();
  const encodedText = enc.encode(plainText);

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
