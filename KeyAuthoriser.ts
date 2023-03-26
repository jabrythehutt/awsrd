import {
  EC2InstanceConnectClient,
  SendSSHPublicKeyCommand,
} from "@aws-sdk/client-ec2-instance-connect";

export class KeyAuthoriser {
  constructor(private client: EC2InstanceConnectClient) {}

  async authorise(request: {
    user: string;
    instanceId: string;
    publicKey: string;
  }): Promise<void> {
    await this.client.send(
      new SendSSHPublicKeyCommand({
        InstanceId: request.instanceId,
        InstanceOSUser: request.user,
        SSHPublicKey: request.publicKey,
      })
    );
  }
}
