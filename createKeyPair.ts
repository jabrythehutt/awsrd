import { KeyPairSyncResult, generateKeyPairSync } from "node:crypto";
import sshpk from "sshpk";

export function createKeyPair(): KeyPairSyncResult<string, string> {
  const { privateKey, publicKey } = generateKeyPairSync("rsa", {
    modulusLength: 4096,
    publicKeyEncoding: {
      type: "spki",
      format: "pem",
    },
    privateKeyEncoding: {
      type: "pkcs8",
      format: "pem",
    },
  });

  return {
    privateKey,
    publicKey: sshpk.parseKey(publicKey, "pem").toString("ssh"),
  };
}
