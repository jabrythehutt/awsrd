import { ConfigStore } from "./ConfigStore";
import { ConfigurationSuffix } from "./ConfigurationSuffix";

export class ProfileStore extends ConfigStore<
  ConfigurationSuffix.Profile,
  string
> {
  constructor() {
    super(ConfigurationSuffix.Profile);
  }
}
