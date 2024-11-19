import { Editor, Notice, Plugin, WorkspaceLeaf } from "obsidian";
import {
	ErrorCode,
	APP_PROPS,
	ERROR_MESSAGES,
	QUILL_VIEW_TYPE,
} from "@/constants";
import {
	DEFAULT_SETTINGS,
	QuillPluginSettings,
	QuillSettingsTab,
} from "@/settings";
import { IPluginServices } from "@/interfaces";
import ApiService from "@/ApiService";
import Features from "@/Features";
import ModalPrompt from "@/components/ModalPrompt";
import QuillView from "@/components/view";

export default class QuillPlugin extends Plugin implements IPluginServices {
	settings: QuillPluginSettings;
	apiService: ApiService;
	features: Features;
	pluginServices: IPluginServices;
	// vault: Vault;
	openModals: ModalPrompt[] = [];

	async onload(): Promise<void> {
		console.clear(); // TODO: Remove this line before publishing
		await this.loadSettings();
		this.apiService = new ApiService(this, this.settings);
		this.features = new Features(this.app, this.apiService, this.settings);
		this.pluginServices = {
			app: this.app,
			toggleView: this.toggleView.bind(this),
			getViewElem: this.getViewElem.bind(this),
			notifyError: this.notifyError.bind(this),
			saveSettings: this.saveSettings.bind(this),
		};

		this.addSettingTab(new QuillSettingsTab(this.app, this));
		this.registerView(
			QUILL_VIEW_TYPE,
			(leaf: WorkspaceLeaf) => new QuillView(leaf, this)
		);

		// RIBBON AND COMMANDS

		// App icon
		this.addRibbonIcon(
			APP_PROPS.appIcon,
			APP_PROPS.appName,
			(evt: MouseEvent) => {
				this.toggleView();
			}
		);

		// Show Quill view command
		this.addCommand({
			id: "show-quill",
			name: "Show Quill",
			callback: () => {
				this.toggleView();
			},
		});

		// Show Quill view command
		// this.addCommand({
		// 	id: "new-conversation",
		// 	name: "New Conversation",
		// 	callback: () => {
		// 		this.toggleView();
		// 		// Call `newConversation`
		// 	},
		// });

		// "Tell me a joke" command
		this.addCommand({
			id: "tell-a-joke",
			name: "Tell me a joke",
			callback: async () => {
				await this.features.executeFeature({ id: "tellAJoke" });
			},
		});

		// "On This Date..." command
		this.addCommand({
			id: "on-this-date",
			name: "On This Date...",
			editorCallback: async (editor: Editor) => {
				await this.features.executeFeature({
					id: "onThisDate",
					outputTarget: editor,
				});
			},
		});

		// "Define..." command
		this.addCommand({
			id: "define",
			name: "Define the word...",
			editorCallback: async (editor: Editor) => {
				const featureId = "define";
				const modal = new ModalPrompt({
					app: this.app,
					settings: this.settings,
					onSend: async (userEntry) => {
						await this.features.executeFeature({
							id: featureId,
							inputText: userEntry,
							outputTarget: editor,
						});
					},
					featureId: featureId,
				});
				this.openModals.push(modal);
				modal.open();
			},
		});

		// Open modal to get prompt
		this.addCommand({
			id: "new-prompt",
			name: "New prompt",
			callback: async () => {
				this.toggleView();
				const modal = new ModalPrompt({
					app: this.app,
					settings: this.settings,
					onSend: async (userEntry) => {
						await this.features.executeFeature({
							id: "newPrompt",
							inputText: userEntry,
						});
					},
				});
				this.openModals.push(modal);
				modal.open();
			},
		});

		// Test upload command ====================================================
		// We don't know yet what the filePath will be. Get it from the modal.
		this.addCommand({
			id: "test-upload",
			name: "Test Upload",
			callback: async () => {
				this.toggleView();
				const modal = new ModalPrompt({
					app: this.app,
					settings: this.settings,
					onSend: async (userEntry, filePath) => {
						await this.features.executeFeature({
							id: "testUpload",
							inputText: userEntry,
							filePath: filePath,
						});
					},
				});
				this.openModals.push(modal);
				modal.open();
			},
		});
		// ========================================================================

		// Send selected text with instruction from modal
		this.addCommand({
			id: "send-text-with-prompt",
			name: "Send selected text with my prompt",
			editorCheckCallback: (checking: boolean, editor: Editor) => {
				const selectedText = editor.getSelection().trim();
				if (selectedText) {
					if (!checking) {
						this.toggleView();
						const modal = new ModalPrompt({
							app: this.app,
							settings: this.settings,
							onSend: async (userEntry) => {
								// Now I have the selected text and prompt
								await this.features.executeFeature({
									id: "sendPromptWithSelectedText",
									inputText: userEntry,
									selectedText: selectedText,
								});
							},
						});
						this.openModals.push(modal);
						modal.open();
					}
					return true;
				}
				return false;
			},
		});
	}

	// VIEW
	// TODO: Add activate and deactivate, and then use them in the toggleView method
	viewIsActive = false;

	async toggleView(): Promise<void> {
		const { workspace } = this.app;
		let leaf: WorkspaceLeaf | null =
			workspace.getLeavesOfType(QUILL_VIEW_TYPE)[0];

		if (!leaf) {
			leaf = workspace.getRightLeaf(false);
		}

		if (leaf) {
			await leaf.setViewState({
				type: QUILL_VIEW_TYPE,
				active: true,
			});
			workspace.revealLeaf(leaf);
			const chatViewContainer = leaf.view.containerEl
				.children[1] as HTMLElement;
			chatViewContainer.tabIndex = 0;
			chatViewContainer.focus();
			const chatViewInput = chatViewContainer?.querySelector("textarea");
			chatViewInput?.focus();
		} else {
			this.notifyError("viewError");
		}
	}

	getViewElem(): HTMLElement | null {
		const leaf = this.app.workspace.getLeavesOfType(QUILL_VIEW_TYPE)[0];
		if (leaf) {
			return leaf.view.containerEl;
		}
		return null;
	}

	onunload(): void {
		this.app.workspace.detachLeavesOfType(QUILL_VIEW_TYPE);
		this.openModals.forEach((modal) => modal.close());
		this.openModals = [];
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
