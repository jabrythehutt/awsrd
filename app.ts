import { App, Duration, Stack } from "aws-cdk-lib";
import { VscInstance } from "./VscInstance";
import { BlockDeviceVolume, CloudFormationInit, InitCommand, InitPackage, InstanceClass, InstanceSize, InstanceType, MachineImage, OperatingSystemType, Peer, Port, SecurityGroup, UserData, Vpc } from "aws-cdk-lib/aws-ec2";

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
const ec2 = new VscInstance(stack, "EC2", {
    vpc,
    securityGroup,
    instanceType: InstanceType.of(InstanceClass.C6G, InstanceSize.XLARGE),
    machineImage: MachineImage.fromSsmParameter(
        '/aws/service/ami-amazon-linux-latest/al2023-ami-kernel-6.1-arm64', {
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
        InitPackage.yum('python3-pip'),
        InitCommand.shellCommand('sudo usermod -a -G docker ec2-user'),
        InitCommand.shellCommand('sudo pip3 install docker-compose'),
        InitCommand.shellCommand('sudo systemctl enable docker.service'),
        InitCommand.shellCommand('sudo systemctl start docker.service')
    ),
    initOptions: {
        timeout: Duration.minutes(30)
    },
    detailedMonitoring: true
});