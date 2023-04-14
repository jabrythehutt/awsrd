import { App, Stack, CfnOutput } from "aws-cdk-lib";
import { VscInstance } from "./VscInstance";
import { StackArg } from "./StackArg";
import { instanceTagName } from "./instanceTagName";
import { instanceTagValue } from "./instanceTagValue";
import { EC2Client } from "@aws-sdk/client-ec2";
import { InstancePropsResolver } from "./InstancePropsResolver";

const app = new App();
const region = process.env.CDK_DEFAULT_REGION;
const ec2Client = new EC2Client({ region });
const propsResolver = new InstancePropsResolver(ec2Client);
const args = Object.values(StackArg).reduce(
  (values, arg) => ({
    ...values,
    [arg]: app.node.tryGetContext(arg),
  }),
  {} as Record<StackArg, string>
);
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