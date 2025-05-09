import { Observable, combineLatest, map } from "rxjs";
import { AwsCredentialIdentityProvider } from "@aws-sdk/types";
import { Client } from "@smithy/smithy-client";
import { toPromise } from "../rxjs";

export class AwsClientFactory {
  constructor(
    private credentialStore: Observable<AwsCredentialIdentityProvider>,
    private region$: Observable<string | undefined>,
  ) {}

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  createAwsClient<T extends Client<any, any, any, any>>(
    clientConstructor: new (arg: {
      credentials: AwsCredentialIdentityProvider;
      region: string | undefined;
    }) => T,
  ): Observable<T> {
    return combineLatest([this.credentialStore, this.region$]).pipe(
      map(
        ([credentials, region]) =>
          new clientConstructor({ credentials, region }),
      ),
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  createAwsClientPromise<T extends Client<any, any, any, any>>(
    clientConstructor: new (arg: {
      credentials: AwsCredentialIdentityProvider;
    }) => T,
  ): Promise<T> {
    return toPromise(this.createAwsClient(clientConstructor));
  }
}
