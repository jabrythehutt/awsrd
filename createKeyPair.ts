import { KeyPairSyncResult, generateKeyPairSync } from "node:crypto";

export function createKeyPair(): KeyPairSyncResult<string, string> {
    return generateKeyPairSync('rsa', {
        modulusLength: 2048,
        publicKeyEncoding: {
          type: 'spki',
          format: 'pem'
        },
        privateKeyEncoding: {
          type: 'pkcs8',
          format: 'pem'
        }
      });
}
