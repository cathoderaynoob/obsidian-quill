import { Editor } from "obsidian";
import OpenAI from "openai";
import { GptRequestPayload, IPluginServices } from "@/interfaces";
import { GptPluginSettings } from "@/settings";
import PayloadMessages from "@/PayloadMessages";

export default class ApiService {
	pluginServices: IPluginServices;
	settings: GptPluginSettings;
	openai: OpenAI;
	payloadMessages: PayloadMessages;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	streamingContent: any | null = null;

	constructor(pluginServices: IPluginServices, settings: GptPluginSettings) {
		this.pluginServices = pluginServices;
		this.settings = settings;
		this.openai = new OpenAI({
			apiKey: this.settings.openaiApiKey,
			dangerouslyAllowBrowser: true,
		});
		this.payloadMessages = new PayloadMessages();
	}

	hasApiKey(): boolean {
		return !!this.settings.openaiApiKey;
	}

	// CHAT =====================================================================
	async getStreamingChatResponse(
		payload: GptRequestPayload,
		callback: (text: string, targetEditor?: Editor) => void,
		targetEditor?: Editor
	): Promise<void> {
		let completedMessage = "";
		try {
			this.streamingContent = await this.openai.chat.completions.create({
				model: payload.model,
				messages: payload.messages,
				stream: true,
				temperature: payload.temperature,
			});

			for await (const chunk of this.streamingContent) {
				// More can be done with this:
				// https://platform.openai.com/docs/api-reference/chat/create
				const content = chunk.choices[0]?.delta?.content;
				if (typeof content === "string")
					callback(content, targetEditor || undefined);
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

	cancelStream() {
		this.streamingContent?.controller?.abort();
		this.streamingContent = null;
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
}
