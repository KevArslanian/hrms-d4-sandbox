import { isAuthApiError, isAuthRetryableFetchError } from '@supabase/supabase-js';

/**
 * Message for a failed signInWithPassword (D4-FN-02). supabase-js returns a network failure in `{ error }` instead of
 * throwing it, so it has to be told apart here. Only an answer from the auth server can mean a wrong email or
 * password; `countsAsAttempt` is false when the password was never checked: the server was unreachable, or Supabase
 * is rate limiting (the real attempt limit).
 */
export function loginErrorMessage(error: unknown): { message: string; countsAsAttempt: boolean } {
  if (isAuthRetryableFetchError(error) || !isAuthApiError(error)) return { message: 'Tidak dapat menghubungi server login. Coba lagi.', countsAsAttempt: false };
  if (error.status === 429) return { message: 'Terlalu banyak percobaan. Coba lagi nanti.', countsAsAttempt: false };
  if (error.code === 'email_not_confirmed' || error.message.toLowerCase().includes('email not confirmed'))
    return { message: 'Email belum dikonfirmasi. Selesaikan konfirmasi melalui email terlebih dahulu.', countsAsAttempt: true };
  return { message: 'Email atau password salah.', countsAsAttempt: true };
}
