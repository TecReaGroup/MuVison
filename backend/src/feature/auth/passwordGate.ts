import { createHash, createHmac, timingSafeEqual } from 'node:crypto'

/**
 * Stateless sessions for a single shared password.
 *
 * A token is `<expiresAtMs>.<hmac>` keyed by the password, so it survives backend restarts
 * and changing the password logs every browser out without any session store.
 */
export class PasswordGate {
  private readonly passwordDigest: Buffer

  constructor(
    private readonly password: string,
    private readonly sessionMaxAgeMs: number,
  ) {
    this.passwordDigest = sha256(password)
  }

  get sessionMaxAgeSeconds(): number {
    return Math.floor(this.sessionMaxAgeMs / 1000)
  }

  // Comparing fixed-length digests keeps the check constant-time regardless of input length
  matchesPassword(candidate: string): boolean {
    return timingSafeEqual(sha256(candidate), this.passwordDigest)
  }

  issueSessionToken(): string {
    const expiresAt = String(Date.now() + this.sessionMaxAgeMs)
    return `${expiresAt}.${this.sign(expiresAt)}`
  }

  acceptsSessionToken(token: string): boolean {
    const [expiresAt, signature] = token.split('.')
    if (!expiresAt || !signature || Number(expiresAt) < Date.now()) return false
    const expected = Buffer.from(this.sign(expiresAt))
    const actual = Buffer.from(signature)
    return actual.length === expected.length && timingSafeEqual(actual, expected)
  }

  private sign(expiresAt: string): string {
    return createHmac('sha256', this.password).update(`muvision-session:${expiresAt}`).digest('base64url')
  }
}

function sha256(text: string): Buffer {
  return createHash('sha256').update(text).digest()
}
