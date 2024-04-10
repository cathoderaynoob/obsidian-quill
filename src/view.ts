import { ItemView, WorkspaceLeaf } from "obsidian";
import { GPT_VIEW_TYPE } from "@/constants";

export default class GptView extends ItemView {
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
		return "Let's chat!";
	}

	async onOpen(): Promise<void> {
		// Example code
		const container = this.containerEl.children[1];
		container.empty();
		container.createEl("h4", { text: "Example view" });
	}

	async onClose(): Promise<void> {}
}
