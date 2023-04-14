import yargs from "yargs";
import { of } from "rxjs";
import { EC2InstanceConnectClient } from "@aws-sdk/client-ec2-instance-connect";
import { InstanceStateResolver } from "./InstanceStateResolver";
import { InstanceStarter } from "./InstanceStarter";
import { readFile } from "fs/promises";
import { hideBin } from "yargs/helpers";
import { KeyAuthoriser } from "./KeyAuthoriser";
import { SessionStarter } from "./SessionStarter";
import { fromIni } from "@aws-sdk/credential-providers";
import { AwsClientFactory } from "./AwsClientFactory";
import { SsmProxyScriptArg } from "./SsmProxyScriptArg";
import { defaultPollPeriod } from "./defaultPollPeriod";
import { PingStatus } from "@aws-sdk/client-ssm";

async function run() {
  const args = await yargs(hideBin(process.argv))
    .option(SsmProxyScriptArg.InstanceId, { type: "string", demand: true })
    .option(SsmProxyScriptArg.Port, { type: "number", demand: true })
    .option(SsmProxyScriptArg.PublicKeyPath, { type: "string", demand: true })
    .option(SsmProxyScriptArg.User, { type: "string", demand: true })
    .option(SsmProxyScriptArg.PollPeriod, {
      type: "number",
      default: defaultPollPeriod,
    })
    .option(SsmProxyScriptArg.Profile, { type: "string", demand: true })
    .option(SsmProxyScriptArg.Region, { type: "string", demand: true })
    .option(SsmProxyScriptArg.SessionManagerBinPath, {
      type: "string",
      demand: true,
    })
    .parse();
  const region = args.region;
  const profile = args.profile;
  const credentials = fromIni({
    profile,
  });
  const clientConfig = {
    credentials,
    region,
  };
  const instanceConnectClient = new EC2InstanceConnectClient(clientConfig);
  const serviceFactory = new AwsClientFactory(of(credentials), of(region));
  const stateResolver = new InstanceStateResolver(serviceFactory);
  const keyAuthoriser = new KeyAuthoriser(instanceConnectClient);
  const sessionStarter = new SessionStarter(
    serviceFactory,
    args.sessionManagerBinPath
  );
  const starter = new InstanceStarter(
    serviceFactory,
    stateResolver,
    args.pollPeriod
  );
  await starter.startInstance(args.instanceId);
  for await (const _ of starter.waitForState(args.instanceId, "running")) {
  }
  for await (const _ of starter.waitForStatus(args.instanceId, PingStatus.ONLINE)) {
  }
  const publicKey = (await readFile(args.publicKeyPath)).toString();
  await keyAuthoriser.authorise({
    user: args.user,
    instanceId: args.instanceId,
    publicKey,
  });
  await sessionStarter.start({
    instanceId: args.instanceId,
    port: args.port,
    profile,
  });
}
run();
