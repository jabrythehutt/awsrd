import {
  EC2Client,
  DescribeInstanceStatusCommand,
  InstanceStateName,
} from "@aws-sdk/client-ec2";
import {
  DescribeInstanceInformationCommand,
  PingStatus,
  SSMClient,
} from "@aws-sdk/client-ssm";

export class InstanceStateResolver {
  constructor(private ssmClient: SSMClient, private ec2Client: EC2Client) {}

  async ping(instanceId: string): Promise<PingStatus | undefined> {
    const response = await this.ssmClient.send(
      new DescribeInstanceInformationCommand({
        Filters: [
          {
            Key: "InstanceIds",
            Values: [instanceId],
          },
        ],
      })
    );
    const instanceInfo = response?.InstanceInformationList?.find(
      (info) => info.InstanceId === instanceId
    );
    return instanceInfo?.PingStatus as PingStatus;
  }

  async isOnline(instanceId: string): Promise<boolean> {
    const pingStatus = await this.ping(instanceId);
    return pingStatus === PingStatus.ONLINE;
  }

  async isRunning(instanceId: string): Promise<boolean> {
    const instanceStatusResponse = await this.ec2Client.send(
      new DescribeInstanceStatusCommand({
        InstanceIds: [instanceId],
        IncludeAllInstances: true,
      })
    );
    const status = instanceStatusResponse.InstanceStatuses?.find(
      (s) => s.InstanceId === instanceId
    );
    if (!status) {
      throw new Error(
        `Couldn't find instance status for instance with ID: ${instanceId}`
      );
    }
    return status.InstanceState?.Name === InstanceStateName.running;
  }
}
