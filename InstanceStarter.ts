import { EC2Client, StartInstancesCommand } from "@aws-sdk/client-ec2";
import { InstanceStateResolver } from "./InstanceStateResolver";

export class InstanceStarter {
    constructor(private ec2Client: EC2Client, private stateResolver: InstanceStateResolver) {
    }

    async start(instanceId: string, pollPeriod: number): Promise<void> {
        let online = await this.stateResolver.isOnline(instanceId);
        if (!online) {
            console.log("Attempting to start EC2 instance:", instanceId)
            await this.ec2Client.send(new StartInstancesCommand({
                InstanceIds: [
                    instanceId
                ]
            }));
        }
        while (!online) {
            await new Promise(resolve => setTimeout(resolve, pollPeriod))
            online = await this.stateResolver.isOnline(instanceId);
        }
        console.log("Instance has started")
    }
}