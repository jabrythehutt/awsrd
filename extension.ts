import { ExtensionContext, commands, window } from "vscode";
import { contributes } from "./package.json";
import { InstanceTreeProvider } from "./InstanceTreeProvider";
import { _InstanceType } from "@aws-sdk/client-ec2";
import { InstanceStarter } from "./InstanceStarter";
import { InstanceStateResolver } from "./InstanceStateResolver";
import { ProfileStore } from "./ProfileStore";
import { RegionStore } from "./RegionStore";
import { createCredentialStore } from "./createCredentialStore";
import { AwsClientFactory } from "./AwsClientFactory";
import { InstanceStore } from "./InstanceStore";
import { InstanceCreator } from "./InstanceCreator";
import { AwsContextResolver } from "./AwsContextResolver";
import { CdkCommander } from "./CdkCommander";
import { InstanceDeleter } from "./InstanceDeleter";
import { CommandSuffix } from "./CommandSuffix";
import { CommandProvider } from "./CommandProvider";
import { DeleteCommandProvider } from "./DeleteCommandProvider";
import { OpenCommandProvider } from "./OpenCommandProvider";
import { CreateCommandProvider } from "./CreateCommandProvider";
import { RegionCommandProvider } from "./RegionCommandProvider";
import { ProfileCommandProvider } from "./ProfileCommandProvider";
import { RefreshCommandProvider } from "./RefreshCommandProvider";
import { InstanceStateCommandProvider } from "./InstanceStateCommandProvider";
import { CommandName } from "./CommandName";

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
  const cdkCommander = new CdkCommander(awsContextResolver, profileStore.value);
  const instanceCreator = new InstanceCreator(cdkCommander);
  const treeView = window.createTreeView(explorerView.id, {
    treeDataProvider: new InstanceTreeProvider(instanceStore),
  });
  context.subscriptions.push(treeView);
  const deleteCommandProvider = new DeleteCommandProvider(
    instanceStore,
    new InstanceDeleter(instanceStore, cdkCommander)
  );
  const openCommandProvider = new OpenCommandProvider(
    serviceFactory,
    instanceStore,
    profileStore.value,
    context,
    instanceStarter,
    awsContextResolver
  );
  const createCommandProvider = new CreateCommandProvider(
    instanceCreator,
    instanceStore
  );
  const regionCommandProvider = new RegionCommandProvider();
  const profileCommandProvider = new ProfileCommandProvider();
  const refreshCommandProvider = new RefreshCommandProvider(instanceStore);
  const commandProviders: {
    [C in `${CommandSuffix}`]: CommandProvider<C, any>;
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
      instanceStarter
    ),
    stop: new InstanceStateCommandProvider(
      CommandSuffix.Stop,
      instanceStore,
      instanceStarter
    ),
  };

  Object.entries(commandProviders).forEach(([commandSuffix, provider]) => {
    commands.registerCommand(
      CommandName[commandSuffix as CommandSuffix],
      (arg1) => provider.execute(arg1)
    );
  });
}
