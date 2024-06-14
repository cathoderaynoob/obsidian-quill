import { ItemView, setIcon, WorkspaceLeaf } from "obsidian";
import { Root, createRoot } from "react-dom/client";
import { GPT_VIEW_TYPE, APP_ICON } from "@/constants";
import { GptPluginSettings } from "@/settings";
import { IPluginServices } from "@/interfaces";
import ApiService from "@/apiService";
import Messages from "@/components/Messages";
import PluginContextProvider from "@/components/PluginContext";
import emitter from "@/customEmitter";

export default class GptView extends ItemView {
	root: Root | null = null;
	settings: GptPluginSettings;
	apiService: ApiService;
	pluginServices: IPluginServices;

	static instance: GptView;

	constructor(
		leaf: WorkspaceLeaf,
		settings: GptPluginSettings,
		apiService: ApiService,
		pluginServices: IPluginServices
	) {
		super(leaf);
		this.settings = settings;
		this.pluginServices = pluginServices;
		this.apiService = apiService;
		GptView.instance = this;
	}

	getViewType(): string {
		return GPT_VIEW_TYPE;
	}

	getIcon(): string {
		return APP_ICON;
	}

	getDisplayText(): string {
		return "GPT Chat";
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
			</PluginContextProvider>
		);

		// Create view title bar with icon.
		// setTimout ensures that the content element is rendered before
		// the title bar element is created.
		setTimeout(() => {
			const titleBar = document.getElementById("gpt-view-title") as HTMLElement;
			setIcon(titleBar, APP_ICON);
		}, 0);
	}

	async onClose(): Promise<void> {
		if (this.root) {
			this.root.unmount();
		}
	}
}
