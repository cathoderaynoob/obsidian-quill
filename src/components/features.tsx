import { App, Editor } from "obsidian";
import { renderToEditor } from "@/editorUtils";
import { PROMPTS } from "@/constants";
import { buildPrompt } from "@/promptBuilder";
import { GptRequestPayload, IPluginServices } from "@/interfaces";
import { GptPluginSettings } from "@/settings";
import { GptTextOutputModal } from "@/components/modals";
import { PayloadMessagesType } from "@/components/Messages";
import emitter from "@/customEmitter";
import ApiService from "@/apiService";
import PayloadMessages from "@/PayloadMessages";

interface FeatureProperties {
	id: string;
	prompt: (inputText?: string) => string;
	processResponse: (response: string, targetEditor?: Editor) => void;
	model?: string;
	temperature?: number;
	stream?: boolean;
	targetContainer?: "view" | "modal";
}

interface ExecutionOptions {
	id: string;
	inputText?: string;
	selectedText?: string;
	formattingGuidance?: string;
	targetEditor?: Editor;
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

		this.payloadMessages = apiService.payloadMessages;
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
				processResponse: async (response, editor: Editor) => {
					if (response.length) {
						await this.renderToEditor(response, editor);
					}
				},
				stream: true,
			},

			// Define...
			define: {
				id: "define",
				prompt: (inputText: string) => {
					return `${inputText}: ` + PROMPTS.define.content;
				},
				processResponse: async (response, editor: Editor) => {
					if (response.length) {
						await this.renderToEditor(response, editor);
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
				targetContainer: "view",
			},

			// SEND SELECTED TEXT WITH PROMPT
			sendPromptWithSelectedText: {
				id: "sendPromptWithSelectedText",
				prompt: (inputText: string) => inputText,
				processResponse: (responseText: string) =>
					emitter.emit("updateMessage", responseText),
				stream: true,
				targetContainer: "view",
			},
		};
	}

	// EXECUTE FEATURE ===========================================================
	async executeFeature({
		id,
		inputText,
		selectedText,
		formattingGuidance,
		targetEditor,
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
		let payloadMessages: PayloadMessagesType[] = [];
		const newPayloadMessage: PayloadMessagesType = {
			role: "user",
			content: payloadPrompt,
		};

		// Target is chat view
		if (feature.targetContainer === "view") {
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

			await emitEvent("newMessage", "user", selectedText);
			if (inputText) await emitEvent("updateMessage", inputText);

			// Add message(s) to the payload
			await this.pluginServices.toggleView();
			if (!this.payloadMessages.getPayloadMessages().length) {
				payloadMessages = this.payloadMessages.addMessage(
					PROMPTS.systemInitial as PayloadMessagesType
				);
			}
			payloadMessages = this.payloadMessages.addMessage(newPayloadMessage);

			// Add a new <Message /> component to the list of messages
			// for the assistant's response
			await emitEvent("newMessage", "assistant");
		} else {
			payloadMessages = [newPayloadMessage];
		}

		const payload: GptRequestPayload = {
			model: feature.model || this.settings.openaiModel,
			messages: payloadMessages,
			temperature: feature.temperature || this.settings.openaiTemperature,
		};

		// Send prompt
		if (feature.stream) {
			await this.apiService.getStreamingChatResponse(
				payload,
				feature.processResponse,
				targetEditor
			);
		} else {
			await this.apiService.getStandardChatResponse(
				payload,
				feature.processResponse,
				targetEditor
			);
		}
	}
}
