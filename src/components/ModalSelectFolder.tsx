import { App, FuzzySuggestModal } from "obsidian";

// SELECT FILE FROM VAULT =====================================================
class ModalSelectFolder extends FuzzySuggestModal<string> {
	private folderPaths: string[];
	private onSelect: (folderPath: string) => void;

	constructor(
		app: App,
		folderPaths: string[],
		onSelect: (folderPath: string) => void
	) {
		super(app);
		this.folderPaths = folderPaths;
		this.onSelect = onSelect;
		this.setPlaceholder("Save message to...");
		this.setInstructions([
			{ command: "↑↓", purpose: "to navigate" },
			{ command: "\u21B5", purpose: "to select folder" },
			{ command: "esc", purpose: "to dismiss" },
		]);
		this.emptyStateText = "No matching folder";
	}

	getItems(): string[] {
		return this.folderPaths;
	}

	getItemText(folderPath: string): string {
		return folderPath;
	}

	onChooseItem(folderPath: string): void {
		this.onSelect(folderPath);
	}
}

export default ModalSelectFolder;
