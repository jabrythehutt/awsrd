export function toExplorerTitle(request: {profile: string, region: string}): string {
    return `Profile: ${request.profile}; Region: ${request.region}`
}
