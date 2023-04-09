import { CreateInstanceRequest } from "./CreateInstanceRequest";
import { join } from "path";

export class InstanceCreator {
  constructor(private cdkApp: string) {}

  async create(request: CreateInstanceRequest): Promise<void> {}

  get cdkBinaryPath(): string {
    return join(require.resolve("aws-cdk"), "bin", "cdk");
  }
}
