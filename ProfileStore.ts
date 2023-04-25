import { ConfigStore } from "./ConfigStore";

export class ProfileStore extends ConfigStore<string> {
  constructor() {
    super("awsrd.profile");
  }
}
