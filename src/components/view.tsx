import { ItemView, setIcon, Vault, WorkspaceLeaf } from "obsidian";
import { Root, createRoot } from "react-dom/client";
import { IPluginServices } from "@/interfaces";
import { APP_PROPS, ELEM_CLASSES_IDS, QUILL_VIEW_TYPE } from "@/constants";
import { QuillPluginSettings } from "@/settings";
import ApiService from "@/ApiService";
import Features from "@/Features";
import Messages from "@/components/Messages";
import PluginContextProvider from "@/components/PluginContext";
import QuillPlugin from "@/main";

export default class QuillView extends ItemView {
  root: Root | null = null;
  settings: QuillPluginSettings;
  apiService: ApiService;
  pluginServices: IPluginServices;
  vault: Vault;
  features: Features;

  static instance: QuillView;

  constructor(leaf: WorkspaceLeaf, plugin: QuillPlugin) {
    super(leaf);
    this.settings = plugin.settings;
    this.apiService = plugin.apiService;
    this.features = plugin.features;
    this.pluginServices = plugin.pluginServices;
    this.vault = this.pluginServices.app.vault;
    QuillView.instance = this;
  }

  getViewType(): string {
    return QUILL_VIEW_TYPE;
  }

  getIcon(): string {
    return APP_PROPS.appIcon;
  }

  getDisplayText(): string {
    return APP_PROPS.appName;
  }

  focusMessagePad(chatViewContainer: HTMLElement): void {
    chatViewContainer.tabIndex = 0;
    chatViewContainer.focus();
    const chatViewInput = chatViewContainer?.querySelector("textarea");
    chatViewInput?.focus();
  }

  async onOpen(): Promise<void> {
    const chatViewContainer = this.containerEl.children[1] as HTMLElement;

    const root = createRoot(chatViewContainer);
    this.root = root;

    root.render(
      <PluginContextProvider
        settings={this.settings}
        pluginServices={this.pluginServices}
        apiService={this.apiService}
        vault={this.vault}
      >
        <Messages executeFeature={this.features.executeFeature} />
      </PluginContextProvider>
    );

    setTimeout(() => {
      // Focus the textarea
      this.focusMessagePad(chatViewContainer);
      // Add the New Chat icon
      const newChatButton = document.getElementById(
        ELEM_CLASSES_IDS.startNewConvo
      ) as HTMLElement;
      if (newChatButton) setIcon(newChatButton, APP_PROPS.appIcon);
    }, 0);
  }

  async onClose(): Promise<void> {
    if (this.root) {
      this.root.unmount();
    }
  }
}
