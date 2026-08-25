import jwt from 'jsonwebtoken';

// Thin wrapper around `jsonwebtoken`. Nothing outside this file should
// `import jwt from 'jsonwebtoken'` directly.
export class JwtService {
  sign(payload, secret, options) {
    return jwt.sign(payload, secret, options);
  }

  verify(token, secret) {
    return jwt.verify(token, secret);
  }

  decode(token) {
    return jwt.decode(token);
  }
}

export const jwtService = new JwtService();
