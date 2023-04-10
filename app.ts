import { App, Duration, Stack, CfnOutput } from "aws-cdk-lib";
import { VscInstance } from "./VscInstance";
import {
  BlockDeviceVolume,
  CloudFormationInit,
  InitPackage,
  InitService,
  InitUser,
  InstanceType,
  MachineImage,
  OperatingSystemType,
  Vpc,
} from "aws-cdk-lib/aws-ec2";
import { StackArg } from "./StackArg";
import { defaultUsernames } from "./defaultUsernames";
import { PlatformName } from "./PlatformName";

const app = new App();
const stack = new Stack(app, "VscEc2", {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
});

const args = Object.values(StackArg).reduce(
  (values, arg) => ({
    ...values,
    [arg]: app.node.tryGetContext(arg),
  }),
  {} as Record<StackArg, string>
);

const vpc = Vpc.fromLookup(stack, "VPC", {
  isDefault: true,
});

const instanceType = new InstanceType(args.instanceType);
const architecture = instanceType.architecture.toString();
const user = defaultUsernames[PlatformName.AmazonLinux][0];
const ec2 = new VscInstance(stack, "EC2", {
  vpc,
  instanceType,
  instanceName: args.instanceName,
  machineImage: MachineImage.fromSsmParameter(
    `/aws/service/ami-amazon-linux-latest/al2023-ami-kernel-6.1-${architecture}`,
    {
      os: OperatingSystemType.LINUX,
    }
  ),
  blockDevices: [
    {
      deviceName: "/dev/xvda",
      volume: BlockDeviceVolume.ebs(parseInt(args.rootVolumeSizeGb)),
    },
  ],
  init: CloudFormationInit.fromElements(
    InitPackage.yum("git"),
    InitPackage.yum("docker"),
    InitUser.fromName(user, {
      groups: ["docker"],
    }),
    InitService.enable("docker", {
      ensureRunning: true,
    })
  ),
  initOptions: {
    timeout: Duration.minutes(30),
  },
});

new CfnOutput(stack, "InstanceIdOutput", {
  value: ec2.instance.instanceId,
});
