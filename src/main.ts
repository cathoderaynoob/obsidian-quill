import { App, Editor, Modal, Notice, Plugin } from "obsidian";

import {
	GptPluginSettings,
	GptSettingsTab,
	DEFAULT_SETTINGS,
} from "@/settings";
import { ERROR_MESSAGES, ErrorCode } from "./constants";

interface GptChatResponse {
	success: boolean;
	message: string;
	error?: string;
}

export default class GptPlugin extends Plugin {
	settings: GptPluginSettings;
	apiKey?: string;
	gptModel?: string;

	async onload() {
		await this.loadSettings();

		// This adds an icon to the ribbon and calls getEngines when clicked
		this.addRibbonIcon("bot", "Obsidian GPT Plugin", (evt: MouseEvent) => {
			this.getEngines();
		});

		// This adds a command to the Command Palette that calls getAJoke when selected
		this.addCommand({
			id: "gpt-joke-modal",
			name: "Tell me a joke",
			callback: async () => {
				const joke = await this.getAJoke();
				new GptModal(this.app, joke).open();
			},
		});

		//  INSERT TEXT
		this.addCommand({
			id: "on-this-date",
			name: "On This Date...",
			hotkeys: [{ modifiers: ["Mod", "Shift"], key: "d" }],
			editorCallback: async (editor: Editor) => {
				const onThisDateText = await this.onThisDate();
				editor.replaceRange(onThisDateText, editor.getCursor());
			},
		});

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new GptSettingsTab(this.app, this));
	}

	hasApiKey(): boolean {
		return !!this.settings.openaiApiKey;
	}

	notifyError(errorCode: ErrorCode): void {
		const errorMessage =
			ERROR_MESSAGES[errorCode] || ERROR_MESSAGES.unknown;
		new Notice(errorMessage);
	}

	// Engine endpoint
	async getEngines() {
		if (!this.hasApiKey()) {
			this.notifyError("noApiKey");
			return "";
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
			console.error("Error:", error);
			this.notifyError("unknown");
		}
	}

	// Generic function to get a response from the GPT chat API based on a payload
	async getGptChatResponse(payload: GptChatRequestPayload): Promise<GptChatResponse> {
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
				return { success: false, message: "", error: `HTTP error status: ${response.status}` };
			}

			const data = await response.json();
			console.log(data.choices[0].message.content);

			return { success: true, message: data.choices[0].message.content };
		} catch (error) {
			console.error("Error:", error);
			this.notifyError("unknown");
			return { success: false, message: "", error: "An unexpected error occurred." };
		}
	}

	// Generates payload and gets a response for "On This Date..." feature
	async onThisDate() {
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
	async getAJoke() {
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

	onunload() {}

	// Loads the default settings, and then overrides them with any saved settings
	async loadSettings() {
		const userSettings = await this.loadData();
		this.settings = {
			...DEFAULT_SETTINGS,
			...userSettings,
		};
	}

	// Saves the current settings to the local storage
	async saveSettings() {
		await this.saveData(this.settings);

		// // In case these were updated in the settings
		// I don't think these do anything
		// this.apiKey = this.settings.openaiApiKey;
		// this.gptModel = this.settings.openaiModel;
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
