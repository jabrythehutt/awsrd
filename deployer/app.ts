import { App, Stack, CfnOutput } from "aws-cdk-lib";
import { VscInstance } from "./VscInstance";
import { InstancePropsResolver } from "./InstancePropsResolver";
import { ContextArg, StackArg } from "../command";
import { of } from "rxjs";
import { AwsClientFactory, createCredentialStore } from "../aws-client";
import { resolveFromCdkContext } from "./resolveFromCdkContext";
import { instanceTagName, instanceTagValue } from "../ec2";

async function run() {
  const app = new App();
  const region = process.env.CDK_DEFAULT_REGION;
  const args = resolveFromCdkContext(
    app.node,
    Object.values({ ...ContextArg, ...StackArg }),
  );
  const credentialStore = createCredentialStore(of(args.profile as string));
  const clientFactory = new AwsClientFactory(credentialStore, of(region));
  const propsResolver = new InstancePropsResolver(clientFactory);
  const stack = new Stack(app, args.stackName, {
    tags: {
      [instanceTagName]: instanceTagValue,
    },
    env: {
      account: process.env.CDK_DEFAULT_ACCOUNT,
      region,
    },
  });
  const props = await propsResolver.resolve(args, stack);
  const ec2 = new VscInstance(stack, "EC2", props);

  new CfnOutput(stack, "InstanceIdOutput", {
    value: ec2.instance.instanceId,
  });
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
