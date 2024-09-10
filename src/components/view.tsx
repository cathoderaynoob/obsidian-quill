import { ItemView, setIcon, Vault, WorkspaceLeaf } from "obsidian";
import { Root, createRoot } from "react-dom/client";
import { IPluginServices } from "@/interfaces";
import { QUILL_VIEW_TYPE, APP_PROPS } from "@/constants";
import { QuillPluginSettings } from "@/settings";
import ApiService from "@/ApiService";
import Features from "@/Features";
import MessagePad from "@/components/MessagePad";
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
		this.vault = plugin.vault;
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
				<Messages />
				<MessagePad executeFeature={this.features.executeFeature} />
			</PluginContextProvider>
		);

		// Add the New Chat icon
		setTimeout(() => {
			const newChatButton = document.getElementById(
				"oq-btn-new-conv"
			) as HTMLElement;
			setIcon(newChatButton, APP_PROPS.appIcon);
		}, 0);
	}

	async onClose(): Promise<void> {
		if (this.root) {
			this.root.unmount();
		}
	}
}
