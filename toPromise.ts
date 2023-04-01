import { Observable, lastValueFrom, take } from "rxjs";

export function toPromise<T>(observable: Observable<T>): Promise<T> {
    return lastValueFrom(observable.pipe(take(1)))
}
