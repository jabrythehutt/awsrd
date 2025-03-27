import packageJson from "../package.json";

export type ConfigurationKey =
  keyof typeof packageJson.contributes.configuration.properties;
