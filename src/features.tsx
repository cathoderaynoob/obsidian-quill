import { App, Editor } from "obsidian";
import { ERROR_MESSAGES } from "@/constants";
import {
	ContainerType,
	GptRequestPayload,
	IPluginServices,
	FeatureProperties,
} from "@/interfaces";
import { GptPluginSettings } from "@/settings";
import { GptTextOutputModal } from "@/modals";
import emitter from "@/customEmitter";
import ApiService from "@/apiService";
import GptView from "@/view";

export class GptFeatures {
	app: App;
	apiService: ApiService;
	settings: GptPluginSettings;
	pluginServices: IPluginServices;
	private featureRegistry: Record<string, FeatureProperties>;

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
				buildPrompt: () =>
					"Tell me a joke (and only the joke) in the style of " +
					"Anthony Jeselnik.",
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
						"Tell me one thing from history in one paragraph that's " +
						"interesting, significant, or funny that happened on " +
						today +
						". Bold and italicize text in markdown format in a visually " +
						"pleasing way. Append the response with exactly `\n\n___\n\n`."
					);
				},
				processResponse: async (response, container: Editor) => {
					if (response.length) {
						await this.apiService.renderToEditor(response, container);
					}
				},
				stream: true,
			},

			// SEND SELECTED TEXT WITH PROMPT
			sendPromptWithSelectedText: {
				id: "sendPromptWithSelectedText",
				buildPrompt: (inputText: string) => {
					return (
						`${inputText}\n\n` +
						`Formatting Instructions:\n\nStyle your response in ` +
						`markdown format where it will improve readability and impact. ` +
						`Use sparingly.`
					);
				},
				processResponse: (responseText: string) => {
					// console.log(responseText);
					emitter.emit("updateMessage", responseText);
				},
				stream: true,
			},
		};
	}

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

		let gptView: GptView | null = null;
		if (container instanceof HTMLElement) {
			gptView = await this.pluginServices.activateView();
			if (!gptView) {
				this.pluginServices.notifyError("viewError");
				return;
			}
		}

		if (payload.stream) {
			await this.apiService.getStreamingChatResponse(
				payload,
				feature.processResponse,
				container,
				gptView ? gptView : undefined
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
		const leafView = await this.pluginServices.activateView();
		if (!leafView) {
			console.error(ERROR_MESSAGES.viewError);
			this.pluginServices.notifyError("viewError");
			return;
		}

		const engines = await this.apiService.getEnginesResponse();

		if (leafView instanceof GptView) {
			leafView.updateEngines(engines);
		}
	}
}
