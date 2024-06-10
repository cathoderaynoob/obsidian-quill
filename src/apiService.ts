import { Editor } from "obsidian";
import OpenAI from "openai";
import { GptEngines, GptRequestPayload, IPluginServices } from "@/interfaces";
import { GptPluginSettings } from "@/settings";
import PayloadMessages from "@/PayloadMessages";

export default class ApiService {
	pluginServices: IPluginServices;
	settings: GptPluginSettings;
	openai: OpenAI;
	payloadMessages: PayloadMessages;

	constructor(pluginServices: IPluginServices, settings: GptPluginSettings) {
		this.pluginServices = pluginServices;
		this.settings = settings;
		this.openai = new OpenAI({
			apiKey: this.settings.openaiApiKey,
			dangerouslyAllowBrowser: true,
		});
		this.payloadMessages = new PayloadMessages();
	}

	async getStreamingChatResponse(
		payload: GptRequestPayload,
		callback: (text: string, targetEditor?: Editor) => void,
		targetEditor?: Editor
	): Promise<void> {
		let completedMessage = "";
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
				if (content) callback(content, targetEditor || undefined);
				completedMessage += content;
			}
		} catch (error) {
			this.pluginServices.notifyError("unknown", error);
			return;
		}
		this.payloadMessages.addMessage({
			role: "assistant",
			content: completedMessage,
		});
		return;
	}

	async getStandardChatResponse(
		payload: GptRequestPayload,
		callback: (text: string, targetEditor?: Editor) => void,
		targetEditor?: Editor
	): Promise<void> {
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
					targetEditor || undefined
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
