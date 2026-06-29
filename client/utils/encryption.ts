import CryptoJS from "crypto-js";

const SALT_SECRET = "SparkLink_Secure_Salt_2026";

/**
 * Encrypt message text using a conversation-specific key.
 * @param text The plaintext message content.
 * @param conversationId The ID of the conversation.
 */
export function encryptMessage(text: string, conversationId: string): string {
  if (!text) return "";
  try {
    const key = conversationId + SALT_SECRET;
    return CryptoJS.AES.encrypt(text, key).toString();
  } catch (error) {
    console.error("Encryption failed:", error);
    return text;
  }
}

/**
 * Decrypt message text using a conversation-specific key.
 * @param ciphertext The encrypted message content.
 * @param conversationId The ID of the conversation.
 */
export function decryptMessage(ciphertext: string, conversationId: string): string {
  if (!ciphertext) return "";
  try {
    const key = conversationId + SALT_SECRET;
    const bytes = CryptoJS.AES.decrypt(ciphertext, key);
    const decrypted = bytes.toString(CryptoJS.enc.Utf8);
    if (!decrypted) {
      // If result is empty, it might be unencrypted plain text from before E2EE
      return ciphertext;
    }
    return decrypted;
  } catch (error) {
    // Return original if decryption fails (fallback for legacy messages)
    return ciphertext;
  }
}
