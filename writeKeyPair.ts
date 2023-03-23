import { generateKeyPairSync } from "node:crypto";
import { writeFile } from "node:fs/promises";

export async function writeKeyPair(outputPaths: {privateKeyPath: string, publicKeyPath: string}): Promise<void> {
    const { privateKey, publicKey } = generateKeyPairSync('rsa', {
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
      await writeFile(outputPaths.privateKeyPath, privateKey);
      await writeFile(outputPaths.publicKeyPath, publicKey)
}