import { App, Duration, Stack, CfnOutput } from "aws-cdk-lib";
import { VscInstance } from "./VscInstance";
import { BlockDeviceVolume, CloudFormationInit, InitCommand, InitPackage, InitService, InitUser, InstanceClass, InstanceSize, InstanceType, MachineImage, OperatingSystemType, Peer, Port, SecurityGroup, UserData, Vpc } from "aws-cdk-lib/aws-ec2";
import { user } from "./user";

const app = new App();
const stack = new Stack(app, "VscEc2", {
    env: {
        account: process.env.CDK_DEFAULT_ACCOUNT,
        region: process.env.CDK_DEFAULT_REGION,
    }
});

const vpc = Vpc.fromLookup(stack, "VPC", {
    isDefault: true
});
const securityGroup = new SecurityGroup(stack, 'SecurityGroup', {
    vpc,
    allowAllOutbound: true
})

for (const peer of [Peer.anyIpv4(), Peer.anyIpv6()]) { 
    securityGroup.addIngressRule(peer, Port.tcp(22))
}

const architecture = "arm64"
const ec2 = new VscInstance(stack, "EC2", {
    vpc,
    securityGroup,
    instanceType: InstanceType.of(InstanceClass.C7G, InstanceSize.XLARGE),
    machineImage: MachineImage.fromSsmParameter(
        `/aws/service/ami-amazon-linux-latest/al2023-ami-kernel-6.1-${architecture}`, {
        os: OperatingSystemType.LINUX,
    }),
    blockDevices: [
        {
          deviceName: '/dev/xvda',
          volume: BlockDeviceVolume.ebs(100),
        }
    ],
    init: CloudFormationInit.fromElements(
        InitPackage.yum('git'),
        InitPackage.yum('docker'),
        InitUser.fromName(user, {
            groups: [
                "docker"
            ]
        }),
        InitService.enable('docker', {
            ensureRunning: true
        })
    ),
    initOptions: {
        timeout: Duration.minutes(30)
    },
    detailedMonitoring: true
});

new CfnOutput(stack, "InstanceIdOutput", {
    value: ec2.instance.instanceId
})
