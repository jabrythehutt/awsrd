import { ConfigStore } from "./ConfigStore";
import { ConfigurationSuffix } from "./ConfigurationSuffix";

export class RegionStore extends ConfigStore<ConfigurationSuffix.Region, string | undefined> {
  constructor() {
    super(ConfigurationSuffix.Region);
  }
}
