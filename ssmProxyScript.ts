import yargs from "yargs";
import { of } from "rxjs"
import { EC2InstanceConnectClient } from "@aws-sdk/client-ec2-instance-connect";
import { InstanceStateResolver } from "./InstanceStateResolver";
import { InstanceStarter } from "./InstanceStarter";
import { readFile } from "fs/promises";
import { hideBin } from "yargs/helpers";
import { KeyAuthoriser } from "./KeyAuthoriser";
import { SessionStarter } from "./SessionStarter";
import { fromIni } from "@aws-sdk/credential-providers";
import { AwsServiceFactory } from "./AwsServiceFactory";

async function run() {
  const args = await yargs(hideBin(process.argv))
    .option("instanceId", { type: "string", demand: true })
    .option("port", { type: "number", demand: true })
    .option("publicKeyPath", { type: "string", demand: true })
    .option("user", { type: "string", demand: true })
    .option("pollPeriod", { type: "number", default: 1000 })
    .option("profile", { type: "string", demand: true })
    .option("region", { type: "string", demand: true })
    .option("sessionManagerBinPath", { type: "string", demand: true })
    .parse();
  const region = args.region;
  const profile = args.profile;
  const credentials = fromIni({
    profile,
    clientConfig: { region },
  });
  const clientConfig = {
    credentials,
  };
  const instanceConnectClient = new EC2InstanceConnectClient(clientConfig);
  const serviceFactory = new AwsServiceFactory(of(credentials))
  const stateResolver = new InstanceStateResolver(serviceFactory);
  const keyAuthoriser = new KeyAuthoriser(instanceConnectClient);
  const sessionStarter = new SessionStarter(
    serviceFactory,
    args.sessionManagerBinPath
  );
  const starter = new InstanceStarter(serviceFactory, stateResolver);
  await starter.start(args.instanceId, args.pollPeriod);
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
