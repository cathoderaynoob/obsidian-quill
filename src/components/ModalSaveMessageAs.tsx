import { App, DropdownComponent, Modal, Vault } from "obsidian";
import { QuillPluginSettings } from "@/settings";

class ModalSaveMessageAs extends Modal {
	private vault: Vault;
	private content: string;
	private folderPaths: string[];
	private selectedFolderPath: string;
	private selectedFileName: string;
	private onSubmit: (name: string, path: string, openFile: boolean) => void;
	private dropdown: DropdownComponent;
	private settings: QuillPluginSettings;

	constructor(
		app: App,
		settings: QuillPluginSettings,
		vault: Vault,
		content: string,
		folderPaths: string[],
		onSubmit: (name: string, path: string, openFile: boolean) => void
	) {
		super(app);
		this.settings = settings;
		this.vault = vault;
		this.content = content;
		this.folderPaths = folderPaths;
		this.onSubmit = onSubmit;
		this.shouldRestoreSelection = true;
	}

	onOpen() {
		const { contentEl } = this;
		const saveAsForm = contentEl.createEl("form", {
			attr: { id: "oq-saveas-form" },
		});

		// Save message as...
		saveAsForm.createEl("h5", { text: "Save message as" });
		const filenameEl = saveAsForm.createEl("input", {
			attr: {
				type: "text",
				id: "oq-saveas-filename",
				placeholder:
					"Enter a file name, or leave blank to use the date and time",
				value: this.createFilename(this.content),
			},
		});
		filenameEl.select();

		// To folder...
		saveAsForm.createEl("h5", { text: "To folder" });
		const selectFolderField = saveAsForm.createEl("select", {
			attr: { id: "oq-saveas-folder" },
		});
		this.folderPaths.forEach((folderPath) => {
			const option = selectFolderField.createEl("option", {
				text: folderPath,
				attr: {
					value: folderPath,
				},
			});
			selectFolderField.appendChild(option);
			selectFolderField.value = this.settings.messagesFolder;
		});
		selectFolderField.onchange = (event) => {
			this.selectedFolderPath = (event.target as HTMLSelectElement).value;
		};

		// Modal Footer
		const footer = saveAsForm.createDiv({
			attr: {
				id: "oq-saveas-footer",
			},
		});

		// Open file after saving
		const openFile = footer.createEl("input", {
			attr: {
				id: "oq-saveas-openfile",
				type: "checkbox",
			},
		});
		footer.createEl("label", {
			text: "Open file after saving",
			attr: {
				for: "oq-saveas-openfile",
			},
		});

		// Save Button
		const saveButton = footer.createEl("button", {
			text: "Save",
			attr: {
				type: "submit",
			},
		});

		saveAsForm.onsubmit = (event) => {
			event.preventDefault();
			this.onSubmit(
				filenameEl.value,
				selectFolderField.value,
				openFile.checked
			);
		};

		// Add event listener to saveAsContainer for Return key
		saveAsForm.addEventListener("keydown", (event) => {
			if (event.key === "Enter") {
				if (document.activeElement === filenameEl) {
					event.preventDefault();
					saveButton.click();
				} else if (document.activeElement === selectFolderField) {
					event.preventDefault();
				}
			}
		});
	}

	createFilename = (content: string) => {
		const headingRegex = /^(#+)\s+(.*)$/m;
		const match = content.match(headingRegex);
		const filename = match ? match[2] : "";
		return filename;
	};

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}

export default ModalSaveMessageAs;
