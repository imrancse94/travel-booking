import bcrypt from 'bcrypt';

// Thin wrapper around the `bcrypt` package. Application code depends on this
// class, never on `bcrypt` directly, so the hashing library can be swapped
// (e.g. for argon2) by editing a single file.
export class BcryptHasher {
  constructor(saltRounds = 12) {
    this.saltRounds = saltRounds;
  }

  async hash(plainText) {
    return bcrypt.hash(plainText, this.saltRounds);
  }

  async compare(plainText, hash) {
    if (!hash) return false;
    return bcrypt.compare(plainText, hash);
  }
}

export const bcryptHasher = new BcryptHasher();
