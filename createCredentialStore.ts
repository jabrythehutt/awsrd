import { fromIni } from "@aws-sdk/credential-providers";
import { AwsCredentialIdentityProvider } from "@aws-sdk/types";
import { Observable, combineLatest, map } from "rxjs"

export function createCredentialStore(request: { profile: Observable<string>, region: Observable<string> }): Observable<AwsCredentialIdentityProvider> {
    return combineLatest([
        request.profile,
        request.region,
    ]).pipe(
        map(([profile, region]) =>
            fromIni({
                profile,
                clientConfig: {
                    region,
                },
            })
        )
    );
}
