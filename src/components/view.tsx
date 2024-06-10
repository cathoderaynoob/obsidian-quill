import { ItemView, setIcon, WorkspaceLeaf } from "obsidian";
import { Root, createRoot } from "react-dom/client";
import { GPT_VIEW_TYPE, APP_ICON } from "@/constants";
import PluginContextProvider from "@/components/PluginContext";
import Messages from "@/components/Messages";
import { GptPluginSettings } from "@/settings";
import { IPluginServices } from "@/interfaces";

export default class GptView extends ItemView {
	root: Root | null = null;
	engines: string[] = [];
	settings: GptPluginSettings;
	pluginServices: IPluginServices;

	static instance: GptView;

	constructor(
		leaf: WorkspaceLeaf,
		settings: GptPluginSettings,
		pluginServices: IPluginServices
	) {
		super(leaf);
		this.settings = settings;
		this.pluginServices = pluginServices;
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
		const root = createRoot(this.containerEl.children[1]);
		this.root = root;

		await root.render(
			<PluginContextProvider
				settings={this.settings}
				pluginServices={this.pluginServices}
			>
				<div className="gpt-view-title"></div>
				<Messages />
			</PluginContextProvider>
		);

		const titleBarElem = this.contentEl.getElementsByClassName(
			"gpt-view-title"
		)[0] as HTMLElement;
		setIcon(titleBarElem, "bird");
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
