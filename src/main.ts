import { App, Editor, Modal, Notice, Plugin, WorkspaceLeaf } from "obsidian";
import {
	GptPluginSettings,
	GptSettingsTab,
	DEFAULT_SETTINGS,
} from "@/settings";
import { ERROR_MESSAGES, ErrorCode, GPT_VIEW_TYPE } from "@/constants";
import GptView from "@/view";

interface GptChatResponse {
	success: boolean;
	message: string;
	error?: string;
}

export default class GptPlugin extends Plugin {
	settings: GptPluginSettings;
	apiKey?: string;
	gptModel?: string;

	async onload(): Promise<void> {
		await this.loadSettings();

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new GptSettingsTab(this.app, this));

		// Add a view to the app
		this.registerView(
			GPT_VIEW_TYPE,
			(leaf: WorkspaceLeaf) => new GptView(leaf)
		);

		// Chat with GPT icon
		this.addRibbonIcon("message-square", "Chat with GPT", (evt: MouseEvent) => {
			this.activateView();
		});

		// Get Engines Icon
		this.addRibbonIcon("bot", "Obsidian GPT Plugin", (evt: MouseEvent) => {
			this.getEngines();
		});

		// "Tell me a joke" command
		this.addCommand({
			id: "gpt-joke-modal",
			name: "Tell me a joke",
			callback: async () => {
				const joke = await this.getAJoke();
				new GptModal(this.app, joke).open();
			},
		});

		//  "On This Date..." command
		this.addCommand({
			id: "on-this-date",
			name: "On This Date...",
			hotkeys: [{ modifiers: ["Mod", "Shift"], key: "d" }],
			editorCallback: async (editor: Editor) => {
				const onThisDateText = await this.onThisDate();
				editor.replaceRange(onThisDateText, editor.getCursor());
			},
		});
	}

	hasApiKey(): boolean {
		return !!this.settings.openaiApiKey;
	}

	notifyError(errorCode: ErrorCode): void {
		const errorMessage = ERROR_MESSAGES[errorCode] || ERROR_MESSAGES.unknown;
		new Notice(errorMessage);
	}

	async activateView(): Promise<void> {
		const { workspace } = this.app;
		let leaves = workspace.getLeavesOfType(GPT_VIEW_TYPE);

		if (leaves.length === 0) {
			const leaf = workspace.getRightLeaf(false);
			if (leaf !== null) {
				await leaf.setViewState({ type: GPT_VIEW_TYPE, active: true });
				leaves = workspace.getLeavesOfType(GPT_VIEW_TYPE);
			}
		}

		if (leaves.length > 0) {
			workspace.revealLeaf(leaves[0]);
		} else {
			console.error(ERROR_MESSAGES.viewError);
		}
	}

	// Engine endpoint
	async getEngines(): Promise<void> {
		if (!this.hasApiKey()) {
			this.notifyError("noApiKey");
		}

		const apiKey = this.settings.openaiApiKey;
		const apiUrl = this.settings.openaiEnginesUrl;

		try {
			// No need to import fetch; it's globally available in Node.js 17.5+.
			const response = await fetch(apiUrl, {
				method: "GET",
				headers: {
					Authorization: `Bearer ${apiKey}`,
				},
			});

			// Assuming the API returns JSON
			const data = await response.json();
			console.table(data.data);
		} catch (error) {
			this.notifyError("unknown");
			console.error("Error:", error);
		}
	}

	// Generic function to get a response from the GPT chat API based on a payload
	async getGptChatResponse(
		payload: GptChatRequestPayload
	): Promise<GptChatResponse> {
		
		const apiKey = this.settings.openaiApiKey;
		const apiUrl = this.settings.openaiChatUrl;

		try {
			const response = await fetch(apiUrl, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${apiKey}`,
				},
				body: JSON.stringify(payload),
			});

			if (!response.ok) {
				return {
					success: false,
					message: "",
					error: `HTTP error status: ${response.status}`,
				};
			}

			const data = await response.json();
			console.log(data.choices[0].message.content);

			return { success: true, message: data.choices[0].message.content };
		} catch (error) {
			console.error("Error:", error);
			this.notifyError("unknown");
			return {
				success: false,
				message: "",
				error: "An unexpected error occurred.",
			};
		}
	}

	// Generates payload and gets a response for "On This Date..." feature
	async onThisDate(): Promise<string> {
		if (!this.hasApiKey()) {
			this.notifyError("noApiKey");
			return "";
		}

		const gptModel = this.settings.openaiModel;
		const today = new Date().toLocaleDateString("en-US", {
			month: "long",
			day: "numeric",
		});

		const payload: GptChatRequestPayload = {
			model: gptModel,
			messages: [
				{
					role: "user",
					content: `Tell me something interesting, significant, or funny
						from history that happened on ${today}.`,
				},
			],
			temperature: 0.7,
		};

		const response = await this.getGptChatResponse(payload);
		if (!response.success) {
			return "";
		}
		return response.message;
	}

	// Generates payload and gets a joke response from the GPT chat API
	async getAJoke(): Promise<string> {
		if (!this.hasApiKey()) {
			this.notifyError("noApiKey");
			return "";
		}

		const gptModel = this.settings.openaiModel;
		const payload: GptChatRequestPayload = {
			model: gptModel,
			messages: [
				{
					role: "user",
					content: "Tell me a joke in the style of Louis CK.",
				},
			],
			temperature: 0.7,
		};

		const response = await this.getGptChatResponse(payload);
		if (!response.success) {
			return "";
		}
		return response.message;
	}

  onunload(): void {
		this.app.workspace.detachLeavesOfType(GPT_VIEW_TYPE);
  }

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
}

// Interface to define the structure of the GPT chat request payload
interface GptChatRequestPayload {
	model: string;
	messages: {
		role: "user" | "system";
		content: string;
	}[];
	temperature: number;
}

class GptModal extends Modal {
	gptText: string;

	constructor(app: App, gptText: string) {
		super(app);
		this.gptText = gptText;
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.setText(this.gptText);
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}
