export interface CommandProvider<A = void> {
  execute(args: A): Promise<void>;
}
