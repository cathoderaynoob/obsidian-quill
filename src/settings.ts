import { App, PluginSettingTab, Setting } from "obsidian";
import QuillPlugin from "@/main";

// Export the settings interface
export interface QuillPluginSettings {
	openaiApiKey: string;
	openaiEnginesUrl: string;
	openaiModel: string;
	openaiTemperature: number;
}

const openaiBaseUrl = "https://api.openai.com/v1";

// Export the default settings
export const DEFAULT_SETTINGS: QuillPluginSettings = {
	openaiApiKey: "",
	openaiEnginesUrl: `${openaiBaseUrl}/engines`,
	openaiModel: "gpt-3.5-turbo",
	openaiTemperature: 0.7,
};

export class QuillSettingsTab extends PluginSettingTab {
	plugin: QuillPlugin;

	constructor(app: App, plugin: QuillPlugin) {
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
