import { ConfigStore } from "../config";

export class ProfileStore extends ConfigStore<string> {
  constructor() {
    super("awsrd.profile");
  }
}
