import { GetCallerIdentityCommand, STSClient } from "@aws-sdk/client-sts";
import { AwsClientFactory } from "./AwsClientFactory";

export class AwsContextResolver {
  constructor(private clientFactory: AwsClientFactory) {}

  async stsClientPromise(): Promise<STSClient> {
    return this.clientFactory.createAwsClientPromise(STSClient);
  }

  async region(): Promise<string> {
    const stsClient = await this.stsClientPromise();
    return stsClient.config.region();
  }

  async account(): Promise<string> {
    const stsClient = await this.stsClientPromise();
    const response = await stsClient.send(new GetCallerIdentityCommand({}));
    return response.Account as string;
  }
}
