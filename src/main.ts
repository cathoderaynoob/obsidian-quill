import { Editor, MarkdownView, Notice, Plugin, WorkspaceLeaf } from "obsidian";
import { GPT_VIEW_TYPE, ErrorCode, ERROR_MESSAGES } from "@/constants";
import { IPluginServices } from "@/interfaces";
import {
	GptPluginSettings,
	GptSettingsTab,
	DEFAULT_SETTINGS,
} from "@/settings";
import { GptTextOutputModal, GptGetPromptModal } from "@/modals";
import ApiService from "@/apiService";
import { GptView } from "@/view";

export default class GptPlugin extends Plugin implements IPluginServices {
	settings: GptPluginSettings;
	apiService: ApiService;
	apiKey?: string;
	gptModel?: string;

	async onload(): Promise<void> {
		await this.loadSettings();
		this.apiService = new ApiService(this.app, this, this.settings);

		// This adds a settings tab so the user can configure
		// various aspects of the plugin
		this.addSettingTab(new GptSettingsTab(this.app, this));

		// Add a view to the app
		this.registerView(
			GPT_VIEW_TYPE,
			(leaf: WorkspaceLeaf) => new GptView(leaf)
		);

		// ICONS AND COMMANDS

		// Chat with GPT icon
		this.addRibbonIcon("message-square", "Chat with GPT", (evt: MouseEvent) => {
			this.activateView();
		});

		// Get Engines Icon
		this.addRibbonIcon("bot", "Get GPT Robots", (evt: MouseEvent) => {
			this.apiService.getEngines();
		});

		// Send selected text with instruction from modal
		this.addCommand({
			id: "gpt-select-and-instruct",
			name: "Send selected text with my prompt",
			editorCheckCallback: (
				checking: boolean,
				editor: Editor,
				view: MarkdownView
			) => {
				const selectedText = editor.getSelection().trim();
				if (selectedText) {
					if (!checking) {
						new GptGetPromptModal(this.app, selectedText, this.apiService).open();
					}
					return true;
				}
				return false;
			},
		});

		// "Tell me a joke" command
		this.addCommand({
			id: "gpt-joke-modal",
			name: "Tell me a joke",
			callback: async () => {
				const joke = await this.apiService.getAJoke();
				new GptTextOutputModal(this.app, joke).open();
			},
		});

		// "On This Date..." command
		this.addCommand({
			id: "on-this-date",
			name: "On This Date...",
			hotkeys: [{ modifiers: ["Mod", "Shift"], key: "d" }],
			editorCallback: async (editor: Editor) => {
				await this.apiService.onThisDate(editor);
			},
		});
	}

	// VIEW
	public async activateView(): Promise<WorkspaceLeaf | null> {
		const { workspace } = this.app;
		let leaf: WorkspaceLeaf | null =
			workspace.getLeavesOfType(GPT_VIEW_TYPE)[0];

		if (!leaf) {
			leaf = workspace.getRightLeaf(false);
			if (leaf) {
				await leaf.setViewState({
					type: GPT_VIEW_TYPE,
					active: true,
				});
			}
		}

		if (leaf) {
			workspace.revealLeaf(leaf);
			return leaf;
		}

		this.notifyError("viewError");
		return null;
	}

	onunload(): void {
		this.app.workspace.detachLeavesOfType(GPT_VIEW_TYPE);
	}

	// DATA STORAGE

	// Loads the default settings, and then overrides them with any saved settings
	async loadSettings(): Promise<void> {
		const userSettings = await this.loadData();
		this.settings = {
			...DEFAULT_SETTINGS,
			...userSettings,
		};
	}

	// Saves the current settings to the local storage
	async saveSettings(): Promise<void> {
		await this.saveData(this.settings);
	}

	public notifyError(errorCode: ErrorCode): void {
		const errorMessage = ERROR_MESSAGES[errorCode] || ERROR_MESSAGES.unknown;
		new Notice(errorMessage);
	}
}
