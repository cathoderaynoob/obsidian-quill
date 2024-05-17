import { StrictMode } from "react";
import { ItemView, WorkspaceLeaf } from "obsidian";
import { Root, createRoot } from "react-dom/client";
import { GPT_VIEW_TYPE } from "@/constants";
import { IPluginServices } from "@/interfaces";
import { GptPluginSettings } from "@/settings";
import { PluginContext } from "@/PluginContext";
import ApiService from "@/apiService";
import Messages from "@/Messages";

export default class GptView extends ItemView {
	private apiService: ApiService;
	private settings: GptPluginSettings;
	private pluginServices: IPluginServices;
	root: Root | null = null;
	message: string;
	responseStream: string;
	engines: string[] = [];

	static instance: GptView;

	constructor(leaf: WorkspaceLeaf) {
		super(leaf);
		GptView.instance = this;
	}

	getViewType(): string {
		return GPT_VIEW_TYPE;
	}

	getIcon(): string {
		return "message-square";
	}

	getDisplayText(): string {
		return "GPT Chat";
	}

	async onOpen(): Promise<void> {
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

	// Engine stuff that needs to be refactored
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
