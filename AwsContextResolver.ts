import { GetCallerIdentityCommand, STSClient } from "@aws-sdk/client-sts";
import { AwsClientFactory } from "./AwsClientFactory";
import { Observable, switchMap } from "rxjs";

export class AwsContextResolver {
  public readonly region$: Observable<string>;
  public readonly account$: Observable<string>;

  constructor(private clientFactory: AwsClientFactory) {
    const stsClient = this.clientFactory.createAwsClient(STSClient);
    this.region$ = stsClient.pipe(
      switchMap((client) => client.config.region())
    );
    this.account$ = stsClient.pipe(
      switchMap((client) => this.toAccount(client))
    );
  }

  protected async toAccount(client: STSClient): Promise<string> {
    const response = await client.send(new GetCallerIdentityCommand({}));
    return response.Account as string;
  }
}
