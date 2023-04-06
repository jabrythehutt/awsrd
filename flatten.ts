import { flattener } from "./flattener";

export function flatten<T>(input: T[][]): T[] {
    return input.reduce(flattener, []);
}
