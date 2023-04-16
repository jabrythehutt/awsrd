export interface CommandProvider<T, A = void> {
    execute(args: A): Promise<void>;
}
