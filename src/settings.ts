import { App, PluginSettingTab, Setting, TFolder } from "obsidian";
import QuillPlugin from "@/main";

// Export the settings interface
export interface QuillPluginSettings {
	openaiApiKey: string;
	openaiEnginesUrl: string;
	openaiModel: string;
	openaiTemperature: number;
	vaultFolder: string;
}

const openaiBaseUrl = "https://api.openai.com/v1";

// Export the default settings
export const DEFAULT_SETTINGS: QuillPluginSettings = {
	openaiApiKey: "",
	openaiEnginesUrl: `${openaiBaseUrl}/engines`,
	openaiModel: "gpt-3.5-turbo-0125",
	openaiTemperature: 0.7,
	vaultFolder: "Quill Conversations",
};

interface OpenAIModels {
	user: {
		model: string;
		display: string;
	}[];
}

export const OPENAI_MODELS: OpenAIModels = {
	user: [
		{
			model: "gpt-4o",
			display: "GPT-4o",
		},
		{
			model: "gpt-3.5-turbo-0125",
			display: "GPT-3.5 Turbo (0125)",
		},
		{
			model: "gpt-3.5-turbo-instruct",
			display: "GPT-3.5 Turbo Instruct",
		},
	],
};

export class QuillSettingsTab extends PluginSettingTab {
	plugin: QuillPlugin;

	constructor(app: App, plugin: QuillPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.addClass("oq-settings");

		containerEl.empty();

		this.containerEl.createEl("h3", {
			text: "Obsidian Quill Settings",
		});

		// OpenAI API Key `openaiApiKey`
		new Setting(containerEl)
			.setName("OpenAI API Key")
			.setDesc("Enter your OpenAI API key.")
			.addText((text) =>
				text
					.setPlaceholder("Enter your key")
					.setValue(this.plugin.settings.openaiApiKey)
					.onChange(async (value) => {
						this.plugin.settings.openaiApiKey = value;
						await this.plugin.saveSettings();
					})
			);

		// OpenAI Model `openaiModel`
		new Setting(containerEl)
			.setName("OpenAI Model")
			.setDesc(
				"Set the default model for Quill commands. (Some commands will " +
					"use a different model tailored to their specific purpose.)"
			)
			.addDropdown((dropdown) => {
				OPENAI_MODELS.user.forEach((model) =>
					dropdown.addOption(model.model, model.display)
				);
				dropdown.setValue(this.plugin.settings.openaiModel);
				dropdown.onChange(async (model) => {
					this.plugin.settings.openaiModel = model;
					await this.plugin.saveSettings();
				});
			});
		// Vault Folder: `vaultFolder`
		new Setting(containerEl)
			.setName("Save Conversations To...")
			.setDesc("Set the default folder for saving Quill conversations.")
			.addDropdown((dropdown) => {
				const folders = this.app.vault
					.getAllLoadedFiles()
					.filter((folder) => folder instanceof TFolder) as TFolder[];
				folders.forEach((folder) =>
					dropdown.addOption(folder.path, folder.path)
				);
				dropdown.setValue(this.plugin.settings.vaultFolder);
				dropdown.onChange(async (folder) => {
					this.plugin.settings.vaultFolder = folder;
					await this.plugin.saveSettings();
				});
			});
	}
}
