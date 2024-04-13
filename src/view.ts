import { ItemView, Notice, WorkspaceLeaf } from "obsidian";
import { ERROR_MESSAGES, GPT_VIEW_TYPE } from "@/constants";

export default class GptView extends ItemView {
	engines: string[] = [];

	constructor(leaf: WorkspaceLeaf) {
		super(leaf);
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
		const container = this.containerEl.children[1] as HTMLElement;
		container.createEl("h4", { text: "GPT Chat", cls: "gpt-view-title" });
	}

	renderEngines(container: HTMLElement) {
		const enginesContainer = container.createEl("div", { attr: {
			id: "gpt-engines",
		}})
		if (this.engines.length > 0) {
			const ul = enginesContainer.createEl("ul");
			this.engines.forEach((engine) => {
				ul.createEl("li", { text: engine });
			});
			const buttonClear: HTMLButtonElement = enginesContainer.createEl("button", { text: "Clear" });
			buttonClear.addEventListener("click", () => {
				const elemToRemove = document.getElementById("gpt-engines");
				if (elemToRemove) {
					elemToRemove.remove();
				}
			});
		} else {
			new Notice(ERROR_MESSAGES.noEngines);
		}
	}

	updateEngines(engines: string[]) {
		this.engines = engines;
		if (this.containerEl.children.length > 1) {
			this.renderEngines(this.containerEl.children[1] as HTMLElement);
		}
	}

	async onClose(): Promise<void> {
		const container = this.containerEl.children[1];
		container.empty();
	}
}
