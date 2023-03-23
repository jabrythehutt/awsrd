import { DescribeInstanceInformationCommand, SSMClient } from "@aws-sdk/client-ssm";

export class InstanceStateResolver {
    constructor(private ssmClient: SSMClient) {
    }

    async ping(instanceId: string): Promise<"Online" | string | undefined> {
        const response = await this.ssmClient.send(new DescribeInstanceInformationCommand({
            Filters: [
                {
                    Key: "InstanceIds",
                    Values: [
                        instanceId
                    ]
                }
            ]
        }));
    
    
        const instanceInfo = response.InstanceInformationList?.shift();
        if (!instanceInfo) {
            throw new Error(`Instance information not found for instance with ID: ${instanceId}`);
        }

        return instanceInfo.PingStatus;
    
    }

    async isOnline(instanceId: string): Promise<boolean> {
        const response = await this.ping(instanceId);
        return response === "Online"
    }
}