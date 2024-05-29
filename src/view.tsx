import { ItemView, WorkspaceLeaf } from "obsidian";
import { StrictMode } from "react";
import { Root, createRoot } from "react-dom/client";
import { GPT_VIEW_TYPE, APP_ICON } from "@/constants";
import { IPluginServices } from "@/interfaces";
import { GptPluginSettings } from "@/settings";
import { PluginContext } from "@/PluginContext";
import ApiService from "@/apiService";
import Messages from "@/Messages";

export default class GptView extends ItemView {
	apiService: ApiService;
	settings: GptPluginSettings;
	pluginServices: IPluginServices;
	root: Root | null = null;
	message: string;
	responseStream: string;
	engines: string[] = [];

	static instance: GptView;

	constructor(
		leaf: WorkspaceLeaf,
		apiService: ApiService,
		settings: GptPluginSettings
	) {
		super(leaf);
		GptView.instance = this;
		this.apiService = apiService;
		this.settings = settings;
		this.pluginServices = apiService.pluginServices;
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
		console.clear();
		const root = createRoot(this.containerEl.children[1]);
		this.root = root;

		root.render(
			<PluginContext.Provider
				value={{
					pluginServices: this.pluginServices,
					apiService: this.apiService,
					settings: this.settings,
				}}
			>
				<StrictMode>
					<h4 className="gpt-view-title">GPT Chat</h4>
					<Messages />
				</StrictMode>
			</PluginContext.Provider>
		);
	}

	async onClose(): Promise<void> {
		if (this.root) {
			this.root.unmount();
		}
	}

	// ========================================================================
	// Engine stuff that needs to be refactored and moved to a separate file
	// ========================================================================

	renderEngines(container: HTMLElement) {
		const enginesContainer = container.createEl("div");
		const root = createRoot(enginesContainer);
		const engines = this.engines;
		const clearEngines = () => {
			const elem = document.getElementById("gpt-engines");
			if (elem) {
				elem.remove();
			}
		};

		if (engines.length > 0) {
			root.render(
				<div id="gpt-engines">
					<ul>
						{engines.map((engine) => (
							<li key={engine}>{engine}</li>
						))}
					</ul>
					<button onClick={clearEngines}>Clear</button>
				</div>
			);
		} else {
			this.pluginServices.notifyError("noEngines");
		}
	}

	updateEngines(engines: string[]) {
		this.engines = engines;
		if (this.containerEl.children.length > 1) {
			this.renderEngines(this.containerEl.children[1] as HTMLElement);
		}
	}
}
