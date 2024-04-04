import { App, Modal, Notice, Plugin } from "obsidian";

import {
	GptPluginSettings,
	GptSettingsTab,
	DEFAULT_SETTINGS,
} from "@/settings";

export default class GptPlugin extends Plugin {
	settings: GptPluginSettings;
	apiKey?: string;
	gptModel?: string;

	async onload() {
		await this.loadSettings();

		// This adds an icon to the ribbon and calls getEngines when clicked.
		this.addRibbonIcon("bot", "Obsidian GPT Plugin", (evt: MouseEvent) => {
			// Called when the user clicks the icon.
			this.getEngines();
		});

		// This adds a command to the Command Palette that calls getAJoke when executed.
		this.addCommand({
			id: "gpt-joke-modal",
			name: "Make me laugh!",
			callback: async () => {
				const joke = await this.getAJoke();
				new GptModal(this.app, joke).open();
			},
		});

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new GptSettingsTab(this.app, this));
	}

	hasApiKey(): boolean {
		if (!this.settings.openaiApiKey) {
			new Notice("Please enter your OpenAI API key in the settings.");
			return false;
		}
		return true;
	}

	async getEngines() {
		if (!this.hasApiKey()) return;

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
		}
	}

	async getAJoke() {
		if (!this.hasApiKey()) return;

		const apiKey = this.settings.openaiApiKey;
		const apiUrl = this.settings.openaiChatUrl;
		const gptModel = this.settings.openaiModel;
		const payload = {
			model: gptModel,
			messages: [
				{
					role: "user",
					content: "Tell me a joke in the style of George Carlin.",
				},
			],
			temperature: 0.7,
		};

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
				throw new Error(`HTTP error! status: ${response.status}`);
			}

			const data = await response.json();
			console.log(data.choices[0].message.content);

			return data.choices[0].message.content;
		} catch (error) {
			console.error("Error:", error);
		}
	}

	onunload() {}

	async loadSettings() {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			await this.loadData()
		);
	}

	async saveSettings() {
		await this.saveData(this.settings);

		// In case these were updated in the settings
		this.apiKey = this.settings.openaiApiKey;
		this.gptModel = this.settings.openaiModel;
	}
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
