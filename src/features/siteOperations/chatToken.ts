const TOKEN_KEY = "gy_chat_token";

/**
 * Get the chat token from localStorage.
 * Token is set by AuthContext.login() when user logs in.
 * Returns empty string if not logged in.
 */
export function getChatToken(): string {
  return localStorage.getItem(TOKEN_KEY) ?? "";
}

export async function ensureChatToken(): Promise<string> {
  return localStorage.getItem(TOKEN_KEY) ?? "";
}
