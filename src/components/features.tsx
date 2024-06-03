import { App, Editor } from "obsidian";
import { renderToEditor } from "@/editorUtils";
import { PROMPTS } from "@/constants";
import { buildPrompt } from "@/promptBuilder";
import {
	ContainerType,
	GptRequestPayload,
	IPluginServices,
} from "@/interfaces";
import { GptPluginSettings } from "@/settings";
import { GptTextOutputModal } from "@/components/modals";
import emitter from "@/customEmitter";
import ApiService from "@/apiService";
import GptView from "@/components/view";
import PayloadMessages from "@/PayloadMessages";

interface FeatureProperties {
	id: string;
	prompt: (inputText?: string) => string;
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

interface ExecutionOptions {
	id: string;
	inputText?: string;
	selectedText?: string;
	formattingGuidance?: string;
	container?: ContainerType;
}

export class GptFeatures {
	app: App;
	apiService: ApiService;
	settings: GptPluginSettings;
	payloadMessages: PayloadMessages;
	pluginServices: IPluginServices;
	renderToEditor: typeof renderToEditor;
	buildPrompt: typeof buildPrompt;
	private featureRegistry: Record<string, FeatureProperties>;

	constructor(app: App, apiService: ApiService, settings: GptPluginSettings) {
		this.app = app;
		this.apiService = apiService;
		this.settings = settings;
		this.payloadMessages = new PayloadMessages();
		this.pluginServices = apiService.pluginServices;
		this.renderToEditor = renderToEditor;
		this.buildPrompt = buildPrompt;

		// FEATURE REGISTRY =======================================================
		this.featureRegistry = {
			// TELL A JOKE
			tellAJoke: {
				id: "tellAJoke",
				prompt: () => PROMPTS.tellAJoke.content,
				processResponse: (response) => {
					if (response.length)
						new GptTextOutputModal(this.app, response).open();
				},
			},

			// ON THIS DATE
			onThisDate: {
				id: "onThisDate",
				prompt: () => {
					const today = new Date().toLocaleDateString("en-US", {
						month: "long",
						day: "numeric",
					});
					return `${today}: ` + PROMPTS.onThisDate.content;
				},
				processResponse: async (response, container: Editor) => {
					if (response.length) {
						await this.renderToEditor(response, container);
					}
				},
				stream: true,
			},

			// NEW PROMPT
			newPrompt: {
				id: "newPrompt",
				prompt: (inputText: string) => inputText,
				processResponse: (responseText: string) =>
					emitter.emit("updateMessage", responseText),
				stream: true,
			},

			// SEND SELECTED TEXT WITH PROMPT
			sendPromptWithSelectedText: {
				id: "sendPromptWithSelectedText",
				prompt: (inputText: string) => inputText,
				processResponse: (responseText: string) =>
					emitter.emit("updateMessage", responseText),
				stream: true,
			},
		};
	}

	// EXECUTE FEATURE ===========================================================
	async executeFeature({
		id,
		inputText,
		selectedText,
		formattingGuidance,
		container,
	}: ExecutionOptions): Promise<void> {
		// Get feature properties
		const feature = this.featureRegistry[id];
		if (!feature) {
			this.pluginServices.notifyError("noFeature");
			return;
		}
		// Build prompt
		const payloadPrompt = this.buildPrompt({
			inputText: feature.prompt(inputText) || undefined,
			selectedText: selectedText || undefined,
			formattingGuidance: formattingGuidance || undefined,
		});

		// Payload
		const payloadMessages = this.payloadMessages.addMessage({
			role: "user",
			content: payloadPrompt,
		});
		const payload: GptRequestPayload = {
			model: feature.model || this.settings.openaiModel,
			messages: payloadMessages,
			temperature: feature.temperature || this.settings.openaiTemperature,
		};

		// Activate view
		let gptView: GptView | null = null;
		if (container instanceof HTMLElement) {
			gptView = await this.pluginServices.toggleView();
			if (!gptView) {
				this.pluginServices.notifyError("viewError");
				return;
			}
		}

		// This should be moved to a separate file (Messages? New file?)
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

		// Add prompt to the GPT Chat view
		await emitEvent("newMessage", "user", selectedText);
		if (inputText) await emitEvent("updateMessage", inputText);

		// Send prompt
		// Not sure if gptView is necessary?
		if (feature.stream) {
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
		const leafView = await this.pluginServices.toggleView();
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
