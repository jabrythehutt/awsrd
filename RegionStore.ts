import { ConfigStore } from "./ConfigStore";

export class RegionStore extends ConfigStore<string | undefined> {
  constructor() {
    super("awsrd.region");
  }
}
