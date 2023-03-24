import { SSMClient, SendCommandCommand } from "@aws-sdk/client-ssm";

export class KeyAuthoriser {
    constructor(private ssmClient: SSMClient) {
    }

    async authorise(request: {user: string, instanceId: string, publicKey: string}): Promise<void> {
        const userSshDir = `~${request.user}/.ssh`
        await this.ssmClient.send(new SendCommandCommand({
            InstanceIds: [
                request.instanceId
            ],
            DocumentName: "AWS-RunShellScript",
            Comment: `Add the user's SSH key to the instance: ${request.instanceId}`,
            Parameters: {
                commands: [
                    `mkdir -p ${userSshDir} || exit 1`,
                    `echo "${request.publicKey}" > ${userSshDir}/authorized_keys`,
                ]
            }
        }))
    }
}