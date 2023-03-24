import {
  DescribeInstanceInformationCommand,
  PingStatus,
  SSMClient,
} from "@aws-sdk/client-ssm";

export class InstanceStateResolver {
  constructor(private ssmClient: SSMClient) {}

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
    if (!instanceInfo) {
      const errorString = `Instance information not found for instance with ID: ${instanceId}`;
      throw new Error(errorString);
    }

    return instanceInfo.PingStatus as PingStatus;
  }

  async isOnline(instanceId: string): Promise<boolean> {
    const response = await this.ping(instanceId);
    return response === PingStatus.ONLINE;
  }
}
