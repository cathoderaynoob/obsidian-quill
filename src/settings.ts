import { App, PluginSettingTab, Setting } from "obsidian";
import GptPlugin from "@/main";

// Export the settings interface
export interface GptPluginSettings {
	openaiApiKey: string;
	openaiEnginesUrl: string;
	openaiModel: string;
	openaiTemperature: number;
}

const openaiBaseUrl = "https://api.openai.com/v1";

// Export the default settings
export const DEFAULT_SETTINGS: GptPluginSettings = {
	openaiApiKey: "",
	openaiEnginesUrl: `${openaiBaseUrl}/engines`,
	openaiModel: "gpt-3.5-turbo",
	openaiTemperature: 0.7,
};

export class GptSettingsTab extends PluginSettingTab {
	plugin: GptPlugin;

	constructor(app: App, plugin: GptPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		new Setting(containerEl)
			.setName("Settings")
			.setDesc("OpenAI API Key")
			.addText((text) =>
				text
					.setPlaceholder("Enter your key")
					.setValue(this.plugin.settings.openaiApiKey)
					.onChange(async (value) => {
						this.plugin.settings.openaiApiKey = value;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl).setDesc("Default Model").addText((text) =>
			text
				.setPlaceholder("Select model")
				.setValue(this.plugin.settings.openaiModel)
				.onChange(async (value) => {
					this.plugin.settings.openaiModel = value;
					await this.plugin.saveSettings();
				})
		);
	}
}
