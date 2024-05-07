import { App, Editor } from "obsidian";
import { ERROR_MESSAGES } from "@/constants";
import {
	ContainerType,
	GptRequestPayload,
	IPluginServices,
	FeatureProperties,
} from "@/interfaces";
import ApiService from "@/apiService";
import { GptPluginSettings } from "@/settings";
import GptView from "@/view";
import { GptTextOutputModal } from "@/modals";

export class GptFeatures {
	app: App;
	apiService: ApiService;
	settings: GptPluginSettings;
	pluginServices: IPluginServices;
	featureRegistry: Record<string, FeatureProperties>;

	constructor(app: App, apiService: ApiService, settings: GptPluginSettings) {
		this.app = app;
		this.apiService = apiService;
		this.settings = settings;

		this.pluginServices = apiService.pluginServices;

		// FEATURE REGISTRY =======================================================
		this.featureRegistry = {
			// TELL A JOKE
			tellAJoke: {
				id: "tellAJoke",
				buildPrompt: () => "Tell me a joke in the style of Anthony Jeselnik.",
				processResponse: (response) => {
					if (response.length)
						new GptTextOutputModal(this.app, response).open();
				},
			},

			// ON THIS DATE
			onThisDate: {
				id: "onThisDate",
				buildPrompt: () => {
					const today = new Date().toLocaleDateString("en-US", {
						month: "long",
						day: "numeric",
					});
					return (
						`Tell me one thing from history in one paragraph that's ` +
						`interesting, significant, or funny that happened on ${today}.`
					);
				},
				processResponse: (response, container: Editor) => {
					if (response.length) {
						this.apiService.renderToEditor(response, container);
					}
				},
				stream: true,
			},

			// SEND SELECTED TEXT WITH PROMPT
			sendPromptWithSelectedText: {
				id: "sendPromptWithSelectedText",
				buildPrompt: (inputText: string) => inputText,
				processResponse: (response, container: HTMLElement) => {
					if (response.length > 0) {
						container.innerText += response;
					}
				},
				stream: true,
			},
		};
	}

	// EXECUTE FEATURE ===========================================================
	async executeFeature(
		featureId: string,
		inputText?: string,
		container?: ContainerType
	): Promise<void> {
		const feature = this.featureRegistry[featureId];
		if (!feature) {
			this.pluginServices.notifyError("Feature not found");
			return;
		}

		const prompt = feature.buildPrompt(inputText);
		const payload: GptRequestPayload = {
			model: feature.model ? feature.model : this.settings.openaiModel,
			messages: [{ role: "user", content: prompt }],
			stream: feature.stream ? feature.stream : false,
			temperature: feature.temperature ? feature.temperature : 0.7,
		};

		if (payload.stream) {
			await this.apiService.getStreamingChatResponse(
				payload,
				feature.processResponse,
				container
			);
		} else {
			await this.apiService.getStandardChatResponse(
				payload,
				feature.processResponse,
				container
			);
		}
	}

	// GET ENGINES ===============================================================
	async getEngines(): Promise<void> {
		const leaf = await this.pluginServices.activateView();
		if (!leaf) {
			console.error(ERROR_MESSAGES.viewError);
			this.pluginServices.notifyError("viewError");
			return;
		}

		const engines = await this.apiService.getEnginesResponse();

		if (leaf.view instanceof GptView) {
			leaf.view.updateEngines(engines);
		}
	}
}
