import { fromIni } from "@aws-sdk/credential-providers";
import { AwsCredentialIdentityProvider } from "@aws-sdk/types";
import { Observable, map } from "rxjs";

export function createCredentialStore(profile$: Observable<string>): Observable<AwsCredentialIdentityProvider> {
  return profile$.pipe(
    map(profile =>
      fromIni({
        profile
      })
    )
  );
}
