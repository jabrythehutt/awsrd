import { ConfigStore } from "../config";

export class RegionStore extends ConfigStore<string | undefined> {
  constructor() {
    super("awsrd.region");
  }
}
