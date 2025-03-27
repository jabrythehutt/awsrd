import { resolve } from "path";
import { SsmProxyScriptArg } from "./SsmProxyScriptArg";

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
    IdentityFile "${resolve(request.privateKeyPath)}"
    ProxyCommand node ${resolve(request.proxyScriptPath)} --${
      SsmProxyScriptArg.InstanceId
    }=%h --${SsmProxyScriptArg.User}=%r --${SsmProxyScriptArg.Port}=%p --${
      SsmProxyScriptArg.PublicKeyPath
    }="${resolve(request.publicKeyPath)}" --${
      SsmProxyScriptArg.SessionManagerBinPath
    }="${request.sessionManagerBinPath}" --${SsmProxyScriptArg.Profile}=${
      request.profile
    } --${SsmProxyScriptArg.Region}=${request.region}
    StrictHostKeyChecking no
`;
}
