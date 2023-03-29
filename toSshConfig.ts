import { resolve } from "path";

export function toSshConfig(request: {
  publicKeyPath: string;
  privateKeyPath: string;
  proxyScriptPath: string;
  sessionManagerBinPath: string;
  profile: string;
  region: string;
}): string {
  return `
Host i-* mi-*
    IdentityFile ${resolve(request.privateKeyPath)}
    ProxyCommand node ${resolve(
      request.proxyScriptPath
    )} --instanceId=%h --user=%r --port=%p --publicKeyPath=${resolve(
    request.publicKeyPath
  )} --sessionManagerBinPath=${request.sessionManagerBinPath} --profile=${
    request.profile
  } --region=${request.region}
    StrictHostKeyChecking no
`;
}
