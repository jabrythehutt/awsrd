import { StackArg } from "../command";

export interface StackRequest {
  props: Record<StackArg, string>;
  region: string;
  profile: string;
  account: string;
}
