import { App } from "obsidian";
import { QuillPluginSettings } from "@/settings";
import { createFeatureRegistry, FeatureProperties } from "@/featureRegistry";
import { executeFeature, ExecutionOptions } from "@/executeFeature";
import { IPluginServices } from "@/interfaces";
import ApiService from "@/ApiService";
import PayloadMessages from "@/PayloadMessages";

export default class Features {
	app: App;
	apiService: ApiService;
	settings: QuillPluginSettings;
	payloadMessages: PayloadMessages;
	featureRegistry: Record<string, FeatureProperties>;
	pluginServices: IPluginServices;

	constructor(app: App, apiService: ApiService, settings: QuillPluginSettings) {
		this.app = app;
		this.apiService = apiService;
		this.settings = settings;
		this.payloadMessages = new PayloadMessages();
		this.featureRegistry = createFeatureRegistry(app);
		this.executeFeature = this.executeFeature.bind(this);
		this.pluginServices = apiService.pluginServices;
	}

	async executeFeature(options: ExecutionOptions) {
		await executeFeature(
			this.featureRegistry,
			options,
			this.settings,
			this.apiService,
			this.payloadMessages,
			this.pluginServices
		);
	}
}
