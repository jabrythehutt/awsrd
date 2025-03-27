import {
  DescribeImagesCommand,
  DescribeInstanceTypesCommand,
  EC2Client,
  Image,
  PlatformValues,
  _InstanceType,
} from "@aws-sdk/client-ec2";
import { VscInstanceProps } from "./VscInstanceProps";
import {
  BlockDeviceVolume,
  CloudFormationInit,
  IMachineImage,
  InitPackage,
  InitService,
  InitUser,
  InstanceType,
  MachineImage,
  OperatingSystemType,
  Vpc,
} from "aws-cdk-lib/aws-ec2";
import { StackArg } from "../create";
import { PlatformName, defaultUsernames } from "../ec2";
import { Duration } from "aws-cdk-lib";
import { Construct } from "constructs";
import { ContextArg } from "../command";
import { AwsClientFactory } from "../aws-client";
import {
  IRole,
  ManagedPolicy,
  Role,
  ServicePrincipal,
} from "aws-cdk-lib/aws-iam";

export class InstancePropsResolver {
  defaultInit = CloudFormationInit.fromElements(
    InitPackage.yum("git"),
    InitPackage.yum("docker"),
    InitUser.fromName(defaultUsernames[PlatformName.AmazonLinux][0], {
      groups: ["docker"],
    }),
    InitService.enable("docker", {
      ensureRunning: true,
    }),
  );

  defaultBlockDeviceName = "/dev/xvda";

  constructor(private clientFactory: AwsClientFactory) {}

  async resolve(
    request: Record<StackArg | ContextArg, string | undefined>,
    construct: Construct,
  ): Promise<VscInstanceProps> {
    const image = request.imageId
      ? await this.describeImage(request.imageId)
      : undefined;
    const deviceName = (
      request.imageId
        ? this.toFirstStorageDeviceName(image as Image)
        : this.defaultBlockDeviceName
    ) as string;
    const instanceType = new InstanceType(request.instanceType as string);
    const machineImage = (
      request.imageId
        ? await this.toMachineImage(image as Image)
        : this.toDefaultMachineImage(instanceType)
    ) as IMachineImage;
    const init = request.imageId ? undefined : this.defaultInit;
    const initOptions = request.imageId
      ? undefined
      : { timeout: Duration.minutes(30) };
    const rootVolumeSizeGb = parseInt(request.rootVolumeSizeGb as string);
    const vpc = Vpc.fromLookup(construct, "VPC", {
      isDefault: true,
    });
    return {
      vpc,
      alarmNamePrefix: request.stackName as string,
      instanceType,
      instanceName: request.stackName,
      machineImage,
      blockDevices: [
        {
          deviceName,
          volume: BlockDeviceVolume.ebs(rootVolumeSizeGb, { encrypted: true }),
        },
      ],
      init,
      initOptions,
      role: this.toRole(request.stackName as string, construct),
      hibernationOptions: {
        configured: await this.isHibernationSupported(instanceType),
      },
    };
  }

  async isHibernationSupported(instanceType: InstanceType): Promise<boolean> {
    const instanceTypeString = instanceType.toString() as _InstanceType;
    const ec2 = await this.clientFactory.createAwsClientPromise(EC2Client);
    const response = await ec2.send(
      new DescribeInstanceTypesCommand({
        InstanceTypes: [instanceTypeString],
      }),
    );
    const instanceInfo = response.InstanceTypes?.find(
      (i) => i.InstanceType === instanceTypeString,
    );
    return !!instanceInfo?.HibernationSupported;
  }

  toRole(stackName: string, construct: Construct): IRole {
    const roleName = `${stackName}InstanceRole`;
    const role = new Role(construct, roleName, {
      roleName,
      assumedBy: new ServicePrincipal("ec2.amazonaws.com"),
    });
    role.addManagedPolicy(
      ManagedPolicy.fromAwsManagedPolicyName("AmazonSSMManagedInstanceCore"),
    );
    return role;
  }

  toDefaultMachineImage(instanceType: InstanceType): MachineImage {
    return MachineImage.fromSsmParameter(
      `/aws/service/ami-amazon-linux-latest/al2023-ami-kernel-6.1-${instanceType.architecture}`,
      {
        os: OperatingSystemType.LINUX,
      },
    );
  }

  async describeImage(imageId: string): Promise<Image | undefined> {
    const ec2Client =
      await this.clientFactory.createAwsClientPromise(EC2Client);
    const response = await ec2Client.send(
      new DescribeImagesCommand({
        ImageIds: [imageId],
      }),
    );
    return response.Images?.find((image) => image.ImageId === imageId);
  }

  async toMachineImage(image: Image): Promise<MachineImage> {
    const ec2Client =
      await this.clientFactory.createAwsClientPromise(EC2Client);
    const region = await ec2Client.config.region();
    const amiMap = {
      [region]: image.ImageId as string,
    };
    return image.Platform === PlatformValues.Windows
      ? MachineImage.genericWindows(amiMap)
      : MachineImage.genericLinux(amiMap);
  }

  toFirstStorageDeviceName(image: Image): string | undefined {
    const devices = image.BlockDeviceMappings || [];
    return devices[0]?.DeviceName;
  }
}
