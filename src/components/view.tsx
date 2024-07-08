import { ItemView, setIcon, WorkspaceLeaf } from "obsidian";
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
	features: Features;

	static instance: QuillView;

	constructor(leaf: WorkspaceLeaf, plugin: QuillPlugin) {
		super(leaf);
		this.settings = plugin.settings;
		this.apiService = plugin.apiService;
		this.features = plugin.features;
		this.pluginServices = plugin.pluginServices;
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
			>
				<div id="oq-view-title" />
				<Messages />
				<MessagePad executeFeature={this.features.executeFeature} />
			</PluginContextProvider>
		);

		// Create view title bar with icon.
		// setTimout ensures that the content element is rendered before
		// the title bar element is created.
		setTimeout(() => {
			const titleBar = document.getElementById("oq-view-title") as HTMLElement;
			setIcon(titleBar, APP_PROPS.appIcon);
		}, 0);
	}

	async onClose(): Promise<void> {
		if (this.root) {
			this.root.unmount();
		}
	}
}
