import { App, PluginSettingTab, Setting, TFolder } from "obsidian";
import QuillPlugin from "@/main";

// Export the settings interface
export interface QuillPluginSettings {
	openaiApiKey: string;
	openaiEnginesUrl: string;
	openaiModel: string;
	openaiTemperature: number;
	saveConversations: boolean;
	conversationsFolder: string;
	messagesFolder: string;
	templatesFolder: string;
	openSavedFile: boolean;
}

const openaiBaseUrl = "https://api.openai.com/v1";

// Export the default settings
export const DEFAULT_SETTINGS: QuillPluginSettings = {
	openaiApiKey: "",
	openaiEnginesUrl: `${openaiBaseUrl}/engines`,
	openaiModel: "gpt-4o-mini",
	openaiTemperature: 0.7,
	saveConversations: true,
	conversationsFolder: "Quill",
	messagesFolder: "Quill",
	openSavedFile: false,
	templatesFolder: "Quill/Templates",
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
			model: "gpt-4o-mini",
			display: "GPT-4o Mini",
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
			text: "Obsidian Quill",
		});

		// OpenAI
		this.containerEl.createEl("h4", {
			text: "OpenAI",
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

		// Save Preferences
		this.containerEl.createEl("h4", {
			text: "Save Preferences",
		});
		// Save Conversations Automatically
		new Setting(containerEl)
			.setName("Save Conversations Automatically")
			.setDesc("Save each conversation to a note automatically")
			.addToggle((toggle) => {
				toggle.setValue(this.plugin.settings.saveConversations);
				toggle.onChange(async () => {
					this.plugin.settings.saveConversations = toggle.getValue();
					await this.plugin.saveSettings();
				});
			});

		// Save Conversations To...
		new Setting(containerEl)
			.setName("Save Conversations To...")
			.setDesc("Choose the default folder for saved conversations.")
			.addDropdown((dropdown) => {
				const folders = this.app.vault
					.getAllLoadedFiles()
					.filter((folder) => folder instanceof TFolder) as TFolder[];
				const folderPaths = folders.map((folder) => folder.path).sort();
				folderPaths.forEach((folderPath) =>
					dropdown.addOption(folderPath, folderPath)
				);
				dropdown.setValue(this.plugin.settings.conversationsFolder);
				dropdown.onChange(async (folder) => {
					this.plugin.settings.conversationsFolder = folder;
					await this.plugin.saveSettings();
				});
			});

		// Save Messages Preferences
		new Setting(containerEl)
			.setName("Save Messages To...")
			.setDesc("Choose the default folder for saving individual messages.")
			.addDropdown((dropdown) => {
				const folders = this.app.vault
					.getAllLoadedFiles()
					.filter((folder) => folder instanceof TFolder) as TFolder[];
				const folderPaths = folders.map((folder) => folder.path).sort();
				folderPaths.forEach((folderPath) =>
					dropdown.addOption(folderPath, folderPath)
				);
				dropdown.setValue(this.plugin.settings.messagesFolder);
				dropdown.onChange(async (folder) => {
					this.plugin.settings.messagesFolder = folder;
					await this.plugin.saveSettings();
				});
			});

		// Template Preferences
		this.containerEl.createEl("h4", {
			text: "Templates Folder",
		});
		// Template Folder
		new Setting(containerEl)
			.setName("Load Templates From...")
			.setDesc(
				"Templates are Obsidian notes you write, each of which define a " +
					"prompt that a Quill command of your making will send. " +
					"Select the folder where you'd like to store them."
			)
			.addDropdown((dropdown) => {
				const folders = this.app.vault
					.getAllLoadedFiles()
					.filter((folder) => folder instanceof TFolder) as TFolder[];
				const folderPaths = folders.map((folder) => folder.path).sort();
				folderPaths.forEach((folderPath) =>
					dropdown.addOption(folderPath, folderPath)
				);
				dropdown.setValue(this.plugin.settings.templatesFolder);
				dropdown.onChange(async (folder) => {
					this.plugin.settings.templatesFolder = folder;
					await this.plugin.saveSettings();
				});
			});
	}
}
