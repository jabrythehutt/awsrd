import { ConfigurationSuffix } from "./ConfigurationSuffix";
import { ExtensionKey } from "./ExtensionKey";
import packageJson from "./package.json";

export type ConfigurationKey = {
  [T in `${ConfigurationSuffix}`]: ExtensionKey<T>;
};
export const ConfigurationKey: ConfigurationKey = Object.values(
  ConfigurationSuffix
).reduce(
  (values, configSuffix) => ({
    ...values,
    [configSuffix]: `${packageJson.name}.${configSuffix}`,
  }),
  {} as ConfigurationKey
);
