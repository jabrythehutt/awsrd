import { ExtensionContext, commands, window } from "vscode";
import { contributes } from "../package.json";
import {
  createCredentialStore,
  AwsClientFactory,
  AwsContextResolver,
} from "../aws-client";
import { combineLatest, map } from "rxjs";
import { ProfileCommandProvider, ProfileStore } from "../profile";
import { RegionCommandProvider, RegionStore } from "../region";
import { InstanceStarter, InstanceStateResolver, InstanceStore } from "../ec2";
import { InstanceTreeProvider, toExplorerTitle } from "../explorer";
import { CommandName, CommandProvider, CommandSuffix } from "../command";
import { CreateCommandProvider } from "../create";
import { DeleteCommandProvider, InstanceDeleter } from "../delete";
import { OpenCommandProvider } from "../open";
import { RefreshCommandProvider } from "../refresh";
import { InstanceStateCommandProvider } from "../state";
import { Deployer, InstancePropsResolver } from "../deployer";
import { resolve } from "path";

export async function activate(context: ExtensionContext) {
  const explorerViews = contributes.views["ec2-explorer"];
  const profileStore = new ProfileStore();
  const regionStore = new RegionStore();
  const credentials$ = createCredentialStore(profileStore.value);
  const serviceFactory = new AwsClientFactory(credentials$, regionStore.value);
  const stateResolver = new InstanceStateResolver(serviceFactory);
  const instanceStarter = new InstanceStarter(serviceFactory, stateResolver);
  const explorerView = explorerViews[0];
  const instanceStore = new InstanceStore(serviceFactory);
  const awsContextResolver = new AwsContextResolver(serviceFactory);
  const treeView = window.createTreeView(explorerView.id, {
    treeDataProvider: new InstanceTreeProvider(instanceStore),
  });
  combineLatest([profileStore.value, awsContextResolver.region$])
    .pipe(map(([profile, region]) => toExplorerTitle({ profile, region })))
    .subscribe((title) => (treeView.title = title));
  context.subscriptions.push(treeView);

  const propsResolver = new InstancePropsResolver(serviceFactory);
  const deployer = new Deployer(propsResolver, {
    bundlePath: resolve(__dirname, process.env.STOPPER_BUNDLE_PATH as string),
  });
  const deleteCommandProvider = new DeleteCommandProvider(
    instanceStore,
    new InstanceDeleter(instanceStore, profileStore, awsContextResolver),
    deployer,
  );
  const openCommandProvider = new OpenCommandProvider(
    serviceFactory,
    instanceStore,
    profileStore.value,
    context,
    instanceStarter,
    awsContextResolver,
    {
      proxyScriptPath: resolve(
        __dirname,
        process.env.PROXY_SCRIPT_PATH as string,
      ),
      sessionManagerPath: resolve(
        __dirname,
        process.env.SESSION_MANAGER_PATH as string,
      ),
    },
  );
  const createCommandProvider = new CreateCommandProvider(
    deployer,
    instanceStore,
    profileStore,
    awsContextResolver,
  );
  const regionCommandProvider = new RegionCommandProvider();
  const profileCommandProvider = new ProfileCommandProvider();
  const refreshCommandProvider = new RefreshCommandProvider(instanceStore);
  const commandProviders: {
    [C in `${CommandSuffix}`]: CommandProvider<unknown>;
  } = {
    delete: deleteCommandProvider,
    open: openCommandProvider,
    create: createCommandProvider,
    selectRegion: regionCommandProvider,
    selectProfile: profileCommandProvider,
    refresh: refreshCommandProvider,
    start: new InstanceStateCommandProvider(
      CommandSuffix.Start,
      instanceStore,
      instanceStarter,
    ),
    stop: new InstanceStateCommandProvider(
      CommandSuffix.Stop,
      instanceStore,
      instanceStarter,
    ),
  };

  Object.entries(commandProviders).forEach(([commandSuffix, provider]) => {
    commands.registerCommand(
      CommandName[commandSuffix as CommandSuffix],
      (arg1) => provider.execute(arg1),
    );
  });
}
