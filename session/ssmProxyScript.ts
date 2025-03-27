import yargs from "yargs";
import { of } from "rxjs";
import { EC2InstanceConnectClient } from "@aws-sdk/client-ec2-instance-connect";
import { readFile } from "fs/promises";
import { hideBin } from "yargs/helpers";
import { KeyAuthoriser } from "./KeyAuthoriser";
import { SessionStarter } from "./SessionStarter";
import { PingStatus } from "@aws-sdk/client-ssm";
import { SsmProxyScriptArg } from "../open";
import {
  defaultPollPeriod,
  InstanceStarter,
  InstanceStateResolver,
} from "../ec2";
import { AwsClientFactory, createCredentialStore } from "../aws-client";

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
  const credentialsStore = createCredentialStore(of(profile));
  const serviceFactory = new AwsClientFactory(credentialsStore, of(region));
  const instanceConnectClient = await serviceFactory.createAwsClientPromise(
    EC2InstanceConnectClient,
  );
  const stateResolver = new InstanceStateResolver(serviceFactory);
  const keyAuthoriser = new KeyAuthoriser(instanceConnectClient);
  const sessionStarter = new SessionStarter(
    serviceFactory,
    args.sessionManagerBinPath,
  );
  const starter = new InstanceStarter(
    serviceFactory,
    stateResolver,
    args.pollPeriod,
  );
  await starter.startInstance(args.instanceId);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars, no-empty
  for await (const _ of starter.waitForState(args.instanceId, "running")) {
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  for await (const _ of starter.waitForStatus(
    args.instanceId,
    PingStatus.ONLINE,
    // eslint-disable-next-line no-empty
  )) {
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
