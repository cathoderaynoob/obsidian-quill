import { ItemView, setIcon, WorkspaceLeaf } from "obsidian";
import { Root, createRoot } from "react-dom/client";
import { GPT_VIEW_TYPE, APP_PROPS } from "@/constants";
import { IPluginServices } from "@/interfaces";
import { GptPluginSettings } from "@/settings";
import GptPlugin from "@/main";
import Messages from "@/components/Messages";
import MessagePad from "@/components/MessagePad";
import PluginContextProvider from "@/components/PluginContext";
import emitter from "@/customEmitter";
import ApiService from "@/ApiService";
import Features from "@/Features";

export default class GptView extends ItemView {
	root: Root | null = null;
	settings: GptPluginSettings;
	apiService: ApiService;
	pluginServices: IPluginServices;
	features: Features;

	static instance: GptView;

	constructor(leaf: WorkspaceLeaf, plugin: GptPlugin) {
		super(leaf);
		this.settings = plugin.settings;
		this.apiService = plugin.apiService;
		this.features = plugin.features;
		this.pluginServices = plugin.pluginServices;
		GptView.instance = this;
	}

	getViewType(): string {
		return GPT_VIEW_TYPE;
	}

	getIcon(): string {
		return APP_PROPS.appIcon;
	}

	getDisplayText(): string {
		return APP_PROPS.appName;
	}

	async onOpen(): Promise<void> {
		const chatViewContainer = this.containerEl.children[1] as HTMLElement;
		const handleKeyDown = (event: KeyboardEvent) => {
			emitter.emit("keydown", event);
		};
		chatViewContainer.addEventListener("keydown", handleKeyDown);
		chatViewContainer.tabIndex = 0;
		chatViewContainer.focus();

		const root = createRoot(chatViewContainer);
		this.root = root;

		root.render(
			<PluginContextProvider
				settings={this.settings}
				pluginServices={this.pluginServices}
				apiService={this.apiService}
			>
				<div id="gpt-view-title" />
				<Messages />
				<MessagePad executeFeature={this.features.executeFeature} />
			</PluginContextProvider>
		);

		// Create view title bar with icon.
		// setTimout ensures that the content element is rendered before
		// the title bar element is created.
		setTimeout(() => {
			const titleBar = document.getElementById("gpt-view-title") as HTMLElement;
			setIcon(titleBar, APP_PROPS.appIcon);
		}, 0);
	}

	async onClose(): Promise<void> {
		if (this.root) {
			this.root.unmount();
		}
	}
}
