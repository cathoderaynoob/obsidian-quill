import { Editor, Notice, Plugin, WorkspaceLeaf } from "obsidian";
import { ErrorCode, ERROR_MESSAGES, GPT_VIEW_TYPE } from "@/constants";
import { IPluginServices } from "@/interfaces";
import {
	DEFAULT_SETTINGS,
	GptPluginSettings,
	GptSettingsTab,
} from "@/settings";
import { GptFeatures } from "@/features";
import { GptPromptModal } from "@/modals";
import ApiService from "@/apiService";
import GptView from "@/view";

export default class GptPlugin extends Plugin implements IPluginServices {
	settings: GptPluginSettings;
	apiService: ApiService;
	features: GptFeatures;

	async onload(): Promise<void> {
		await this.loadSettings();
		this.apiService = new ApiService(this, this.settings);
		this.features = new GptFeatures(this.app, this.apiService, this.settings);

		// This adds a settings tab so the user can configure
		// various aspects of the plugin
		this.addSettingTab(new GptSettingsTab(this.app, this));

		// Add a view to the app
		this.registerView(
			GPT_VIEW_TYPE,
			(leaf: WorkspaceLeaf) => new GptView(leaf, this.apiService, this.settings)
		);

		// RIBBON AND COMMANDS

		// Chat with GPT icon
		this.addRibbonIcon("message-square", "Chat with GPT", (evt: MouseEvent) => {
			this.activateView();
		});

		// Get Engines Icon
		this.addRibbonIcon("bot", "Get GPT Robots", (evt: MouseEvent) => {
			this.features.getEngines();
		});

		// "Tell me a joke" command
		this.addCommand({
			id: "gpt-joke-modal",
			name: "Tell me a joke",
			callback: async () => {
				await this.features.executeFeature("tellAJoke");
			},
		});

		// "On This Date..." command
		this.addCommand({
			id: "on-this-date",
			name: "On This Date...",
			hotkeys: [{ modifiers: ["Mod", "Shift"], key: "d" }],
			editorCallback: async (editor: Editor) => {
				await this.features.executeFeature("onThisDate", "", editor);
			},
		});

		// Open modal to get prompt
		this.addCommand({
			id: "gpt-new-prompt",
			name: "New prompt",
			callback: () => {
				this.activateView();
				new GptPromptModal(this.app, async (prompt) => {
					await this.features.executeFeature("newPrompt", prompt);
				}).open();
			},
		});

		// Send selected text with instruction from modal
		this.addCommand({
			id: "gpt-select-and-prompt",
			name: "Send selected text with my prompt",
			hotkeys: [{ modifiers: ["Mod", "Shift"], key: "s" }],
			editorCheckCallback: (checking: boolean, editor: Editor) => {
				const selectedText = editor.getSelection().trim();
				if (selectedText) {
					if (!checking) {
						this.activateView();
						const modal = new GptPromptModal(
							this.app,
							async (prompt) => {
								// Now I have the selected text and prompt
								await this.features.executeFeature(
									"sendPromptWithSelectedText",
									prompt
								);
							},
							selectedText
						);

						modal.open();
					}
					return true;
				}
				return false;
			},
		});
	}

	// VIEW
	async activateView(): Promise<GptView | null> {
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
			return leaf ? (leaf.view as GptView) : null;
		}

		this.notifyError("viewError");
		return null;
	}

	onunload(): void {
		this.app.workspace.detachLeavesOfType(GPT_VIEW_TYPE);
	}

	// DATA STORAGE
	// Loads the default settings, and then overrides them with
	// any saved settings
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

	// MISCELLANEOUS
	notifyError(errorCode: ErrorCode, consoleMsg?: string): void {
		const errorMessage = ERROR_MESSAGES[errorCode] || ERROR_MESSAGES.unknown;
		new Notice(errorMessage);
		if (consoleMsg) {
			console.error(consoleMsg);
		}
	}
}
