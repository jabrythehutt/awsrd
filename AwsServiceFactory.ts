import { Observable, map } from "rxjs";
import { AwsCredentialIdentityProvider } from "@aws-sdk/types";
import { Client } from "@aws-sdk/smithy-client";
import { toPromise } from "./toPromise";

export class AwsServiceFactory {
  constructor(
    private credentialStore: Observable<AwsCredentialIdentityProvider>
  ) {}

  createAwsClient<T extends Client<any, any, any, any>>(
    clientConstructor: new (arg: {
      credentials: AwsCredentialIdentityProvider;
    }) => T
  ): Observable<T> {
    return this.credentialStore.pipe(
      map((credentials) => new clientConstructor({ credentials }))
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
