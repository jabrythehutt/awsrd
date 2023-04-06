import { Observable, combineLatest, map } from "rxjs";
import { AwsCredentialIdentityProvider } from "@aws-sdk/types";
import { Client } from "@aws-sdk/smithy-client";
import { toPromise } from "./toPromise";

export class AwsClientFactory {
  constructor(
    private credentialStore: Observable<AwsCredentialIdentityProvider>,
    private region$: Observable<string>
  ) {}

  createAwsClient<T extends Client<any, any, any, any>>(
    clientConstructor: new (arg: {
      credentials: AwsCredentialIdentityProvider;
      region: string;
    }) => T
  ): Observable<T> {
    return combineLatest([this.credentialStore, this.region$]).pipe(
      map(
        ([credentials, region]) =>
          new clientConstructor({ credentials, region })
      )
    );
  }

  createAwsClientPromise<T extends Client<any, any, any, any>>(
    clientConstructor: new (arg: {
      credentials: AwsCredentialIdentityProvider;
    }) => T
  ): Promise<T> {
    return toPromise(this.createAwsClient(clientConstructor));
  }
}
