import { App, Editor } from "obsidian";
import { PROMPTS } from "@/constants";
import {
	ContainerType,
	GptRequestPayload,
	IPluginServices,
} from "@/interfaces";
import { GptPluginSettings } from "@/settings";
import { GptTextOutputModal } from "@/modals";
import emitter from "@/customEmitter";
import ApiService from "@/apiService";
import GptView from "@/view";

interface FeatureProperties {
	id: string;
	buildPrompt: (inputText?: string) => string;
	processResponse: (
		response: string,
		container?: ContainerType,
		gptView?: GptView
	) => void;
	model?: string;
	temperature?: number;
	stream?: boolean;
	container?: ContainerType;
}

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
				buildPrompt: () => PROMPTS.tellAJoke.content,
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
					return `${today}: ` + PROMPTS.onThisDate.content;
				},
				processResponse: async (response, container: Editor) => {
					if (response.length) {
						await this.apiService.renderToEditor(response, container);
					}
				},
				stream: true,
			},

			// NEW PROMPT
			newPrompt: {
				id: "newPrompt",
				buildPrompt: (inputText: string) => inputText,
				processResponse: (responseText: string) =>
					emitter.emit("updateMessage", responseText),
				stream: true,
			},

			// SEND SELECTED TEXT WITH PROMPT
			sendPromptWithSelectedText: {
				id: "sendPromptWithSelectedText",
				buildPrompt: (inputText: string) => inputText,
				processResponse: (responseText: string) =>
					emitter.emit("updateMessage", responseText),
				stream: true,
			},
		};
	}

	async executeFeature(
		featureId: string,
		inputText?: string,
		selectedText?: string,
		container?: ContainerType
	): Promise<void> {
		const feature = this.featureRegistry[featureId];
		if (!feature) {
			this.pluginServices.notifyError("noFeature");
			return;
		}
		let prompt = feature.buildPrompt(inputText);
		if (selectedText) {
			// prepend prompt with selected text
			prompt = `${selectedText}\n\n${prompt}`;
		}
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

		// Wrap emitter.emit in a promise
		// Resolves issue with race condition
		const emitEvent = (
			event: string,
			role: string,
			selectedText?: string
		): Promise<void> => {
			return new Promise<void>((resolve) => {
				emitter.emit(event, role, selectedText);
				resolve();
			});
		};

		// Add prompt to the GPT Chat View
		await emitEvent("newMessage", "user", selectedText);
		if (inputText) await emitEvent("updateMessage", inputText);
		// await emitEvent("updateMessage", inputText);

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
			this.pluginServices.notifyError("viewError");
			return;
		}

		const engines = await this.apiService.getEnginesResponse();

		if (leafView instanceof GptView) {
			leafView.updateEngines(engines);
		}
	}
}
