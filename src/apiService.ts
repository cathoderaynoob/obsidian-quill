import OpenAI from "openai";
import {
	ContainerType,
	GptEngines,
	GptRequestPayload,
	IPluginServices,
} from "@/interfaces";
import { GptPluginSettings } from "@/settings";
import emitter from "@/customEmitter";
import GptView from "@/components/view";

export default class ApiService {
	pluginServices: IPluginServices;
	settings: GptPluginSettings;
	openai: OpenAI;

	constructor(pluginServices: IPluginServices, settings: GptPluginSettings) {
		this.pluginServices = pluginServices;
		this.settings = settings;
		// Note: I'm not sure it's possible with an Obsidian plugin to get around
		// setting dangerouslyAllowBrowser: true
		this.openai = new OpenAI({
			apiKey: this.settings.openaiApiKey,
			dangerouslyAllowBrowser: true,
		});
	}

	// This method is used to get a response from the OpenAI API.
	// It also:
	// (1) Adds a new <Message /> component to the list of messages.
	// (2) Adds a new message to the list of messages.
	// (3) Updates the most recent message with streaming content from the API.
	// (4) Adds a message after the API response.
	// (5) Renders the response to the editor.
	// (6) Returns the response from the API.
	async getStreamingChatResponse(
		payload: GptRequestPayload,
		callback: (
			text: string,
			container?: ContainerType,
			gptView?: GptView
		) => void,
		container?: ContainerType,
		gptView?: GptView
	): Promise<void> {
		// Add a new <Message /> component to the list of messages
		emitter.emit("newMessage", "assistant");

		try {
			const streamingContent = await this.openai.chat.completions.create({
				model: payload.model,
				messages: payload.messages,
				stream: true,
				temperature: payload.temperature,
			});
			for await (const chunk of streamingContent) {
				// More can be done with this:
				// https://platform.openai.com/docs/api-reference/chat/create
				const content = chunk.choices[0]?.delta?.content;
				if (content)
					callback(
						content,
						container ? container : undefined,
						gptView ? gptView : undefined
					);
			}
		} catch (error) {
			this.pluginServices.notifyError("unknown", error);
			return;
		}
		return;
	}

	// TODO: Update to OpenAI method
	async getStandardChatResponse(
		payload: GptRequestPayload,
		callback: (
			text: string,
			container?: ContainerType,
			gptView?: GptView
		) => void,
		container?: ContainerType,
		gptView?: GptView
	): Promise<void> {
		// Add a new <Message /> component to the list of messages
		emitter.emit("newMessage", "assistant");

		try {
			const completion = await this.openai.chat.completions.create({
				model: payload.model,
				messages: payload.messages,
				temperature: payload.temperature,
			});
			// More can be done with this:
			// https://platform.openai.com/docs/api-reference/chat/create
			if (completion.choices[0]?.message?.content) {
				callback(
					completion.choices[0]?.message?.content,
					container ? container : undefined,
					gptView ? gptView : undefined
				);
			}
		} catch (error) {
			this.pluginServices.notifyError("unknown", error);
			return;
		}
		return;
	}

	async getEnginesResponse(): Promise<string[]> {
		const apiUrl = this.settings.openaiEnginesUrl;

		try {
			const requestOptions = this.setupRequestOptions("GET");
			if (!requestOptions) return [];

			const response = await fetch(apiUrl, requestOptions);
			const data = await response.json();
			const engines: string[] = data.data
				.map((engine: GptEngines) => engine.id)
				.sort();
			return engines;
		} catch (error) {
			this.pluginServices.notifyError("unknown");
			return [];
		}
	}

	hasApiKey(): boolean {
		return !!this.settings.openaiApiKey;
	}

	// Move to a different file with other related methods(?)
	private setupRequestOptions(
		method: "GET" | "POST",
		payload?: GptRequestPayload
	): RequestInit | null {
		if (!this.hasApiKey()) {
			this.pluginServices.notifyError("noApiKey");
		}
		return {
			method: method,
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${this.settings.openaiApiKey}`,
			},
			body: payload ? JSON.stringify(payload) : undefined,
		};
	}
}
