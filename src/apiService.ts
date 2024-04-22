import { App, Editor } from "obsidian";
import { ERROR_MESSAGES } from "@/constants";
import {
	IPluginServices,
	GptEngines,
	GptRequestPayload,
	GptChatResponse,
} from "@/interfaces";
import { GptPluginSettings } from "@/settings";
import { GptView } from "@/view";

export default class ApiService {
	app: App;
	pluginServices: IPluginServices;
	settings: GptPluginSettings;

	constructor(
		app: App,
		pluginServices: IPluginServices,
		settings: GptPluginSettings
	) {
		this.app = app;
		this.pluginServices = pluginServices;
		this.settings = settings;
	}

	async sendPromptWithSelectedText(
		promptWithSelectedText: string
	): Promise<void> {

		const leaf = await this.pluginServices.activateView();
		if (!leaf) {
			console.error(ERROR_MESSAGES.viewError);
			this.pluginServices.notifyError("viewError");
			return;
		}
		const container = leaf.view.containerEl.children[1].createEl("div", { cls: "gpt-msg-container" });
		
		const gptModel = this.settings.openaiModel;
		const apiKey = this.settings.openaiApiKey;
		const apiUrl = this.settings.openaiChatUrl;

		const payload: GptRequestPayload = {
			model: gptModel,
			messages: [
				{
					role: "user",
					content: promptWithSelectedText,
				},
			],
			stream: true,
			temperature: 0.7,
		};

		const requestOptions = {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${apiKey}`,
			},
			body: JSON.stringify(payload),
		};

		try {
			const response = await fetch(apiUrl, requestOptions);
			if (!response.body) {
				return;
			}

			const reader = response.body.getReader();
			const decoder = new TextDecoder();
			let isReading = true;
			let paragraphText = "";

			if (leaf.view instanceof GptView) {
				let x = 0;
				while (isReading) {
					if (x > 500) {
						isReading = false;
						console.error("BOOM! Reached limit.");
						break;
					}
					x++;

					const { done, value } = await reader.read();
					if (done) {
						isReading = false;
						break;
					}
					const chunkText = decoder.decode(value, { stream: true });
					// Some of this is based on the example from @schnerd's comment here:
					// https://github.com/openai/openai-node/issues/18#issuecomment-1369996933
					const jsonLines = chunkText
						.split("\n")
						.filter((line) => line.trim() !== "");
					for (const jsonLine of jsonLines) {
						const message = jsonLine.replace(/^data: /, "");
						if (message === "[DONE]") {
							break;
						}
						try {
							const parsed = JSON.parse(message);
							if (parsed.choices[0]?.delta?.content) {
								const word: string = parsed.choices[0].delta.content.toString();
								leaf.view.renderSelectedTextResponse(word, container);
								paragraphText += word;
							}
						} catch (error) {
							console.error(
								"Could not JSON parse stream message",
								message,
								error
							);
						}
					}
				}
				console.log(paragraphText);
			}
		} catch (error) {
			console.error("Fetch error:", error);
		}
	}

	// `engines` endpoint
	public async getEngines(): Promise<string[]> {
		if (!this.hasApiKey()) {
			this.pluginServices.notifyError("noApiKey");
			return [ERROR_MESSAGES.noApiKey];
		}

		const leaf = await this.pluginServices.activateView();
		if (!leaf) {
			console.error(ERROR_MESSAGES.viewError);
			return [ERROR_MESSAGES.viewError];
		}

		const apiKey = this.settings.openaiApiKey;
		const apiUrl = this.settings.openaiEnginesUrl;

		try {
			// No need to import fetch; it's globally available in Node.js 17.5+.
			const response = await fetch(apiUrl, {
				method: "GET",
				headers: {
					Authorization: `Bearer ${apiKey}`,
				},
			});

			// Assuming the API returns JSON
			const data = await response.json();
			const engines: string[] = data.data
				.map((engine: GptEngines) => engine.id)
				.sort();
			console.table(engines);
			if (leaf.view instanceof GptView) {
				leaf.view.updateEngines(engines);
			}
			return engines;
		} catch (error) {
			this.pluginServices.notifyError("noEngines");
			console.error("Error:", error);
			return [ERROR_MESSAGES.noEngines];
		}
	}

	// Generic function to get a response from the GPT chat API based on a payload
	async getGptChatResponse(
		payload: GptRequestPayload
	): Promise<GptChatResponse> {
		const apiKey = this.settings.openaiApiKey;
		const apiUrl = this.settings.openaiChatUrl;

		try {
			const response = await fetch(apiUrl, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${apiKey}`,
				},
				body: JSON.stringify(payload),
			});

			if (!response.ok) {
				return {
					success: false,
					message: "",
					error: `HTTP error status: ${response.status}`,
				};
			}

			const data = await response.json();

			return { success: true, message: data.choices[0].message.content };
		} catch (error) {
			console.error("Error:", error);
			this.pluginServices.notifyError("unknown");
			return {
				success: false,
				message: "",
				error: "An unexpected error occurred.",
			};
		}
	}

	public async getGptStreamingResponse(
		payload: GptRequestPayload,
		editor: Editor
	): Promise<void> {
		const apiKey = this.settings.openaiApiKey;
		const apiUrl = this.settings.openaiChatUrl;

		const requestOptions = {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${apiKey}`,
			},
			body: JSON.stringify(payload),
		};

		try {
			const response = await fetch(apiUrl, requestOptions);
			if (!response.body) {
				return;
			}

			const reader = response.body.getReader();
			const decoder = new TextDecoder();
			let isReading = true;
			let lineNum = editor.getCursor().line;
			let charNum = editor.getCursor().ch;
			let paragraphText = "";

			let x = 0;

			while (isReading) {
				if (x > 500) {
					isReading = false;
					console.error("BOOM! Reached limit.");
					break;
				}
				x++;
				const { done, value } = await reader.read();
				if (done) {
					isReading = false;
					break;
				}
				const chunkText = decoder.decode(value, { stream: true });
				// Some of this is based on the example from @schnerd's comment here:
				// https://github.com/openai/openai-node/issues/18#issuecomment-1369996933
				const jsonLines = chunkText
					.split("\n")
					.filter((line) => line.trim() !== "");
				for (const jsonLine of jsonLines) {
					const message = jsonLine.replace(/^data: /, "");
					if (message === "[DONE]") {
						break;
					}
					try {
						const parsed = JSON.parse(message);
						if (parsed.choices[0]?.delta?.content) {
							const word: string = parsed.choices[0].delta.content.toString();

							paragraphText += word;
							charNum = paragraphText.length - word.length;

							editor.replaceRange(word, {
								line: lineNum,
								ch: charNum,
							});

							const numReturns: number = [...word.matchAll(/\n/g)].length;
							if (numReturns) {
								paragraphText = "";
								lineNum += numReturns;
								charNum = 0;
							}
						}
					} catch (error) {
						console.error(
							"Could not JSON parse stream message",
							message,
							error
						);
					}
					editor.setCursor({
						line: lineNum + 1,
						ch: 0,
					});
				}
			}
		} catch (error) {
			console.error("Fetch error:", error);
		}
	}

	// Generates payload and gets a streaming response for "On This Date..."
	async onThisDate(editor: Editor): Promise<void> {
		if (!this.hasApiKey()) {
			this.pluginServices.notifyError("noApiKey");
			return;
		}

		const gptModel = this.settings.openaiModel;
		const today = new Date().toLocaleDateString("en-US", {
			month: "long",
			day: "numeric",
		});

		const payload: GptRequestPayload = {
			model: gptModel,
			messages: [
				{
					role: "user",
					content: `Tell me one thing from history in one paragraph that's
						interesting, significant, or funny that happened on ${today}.`,
				},
			],
			stream: true,
			temperature: 0.7,
		};

		this.getGptStreamingResponse(payload, editor);
	}

	// Keeping this for now as a reference for standard requests

	// Generates payload and gets a standard response for "On This Date..." feature
	// async onThisDate(): Promise<string> {
	// 	if (!this.hasApiKey()) {
	// 		this.pluginServices.notifyError("noApiKey");
	// 		return "";
	// 	}

	// 	const gptModel = this.settings.openaiModel;
	// 	const today = new Date().toLocaleDateString("en-US", {
	// 		month: "long",
	// 		day: "numeric",
	// 	});

	// 	const payload: GptRequestPayload = {
	// 		model: gptModel,
	// 		messages: [
	// 			{
	// 				role: "user",
	// 				content: `Tell me something interesting, significant, or funny
	// 					from history that happened on ${today}.`,
	// 			},
	// 		],
	// 		stream: true,
	// 		temperature: 0.7,
	// 	};

	// 	const response = await this.getGptChatResponse(payload);
	// 	if (!response.success) {
	// 		return "";
	// 	}
	// 	return response.message;
	// }

	// Generates payload and gets a joke response from the GPT chat API
	async getAJoke(): Promise<string> {
		if (!this.hasApiKey()) {
			this.pluginServices.notifyError("noApiKey");
			return "";
		}

		const gptModel = this.settings.openaiModel;
		const payload: GptRequestPayload = {
			model: gptModel,
			messages: [
				{
					role: "user",
					content: "Tell me a joke in the style of Louis CK.",
				},
			],
			temperature: 0.7,
		};

		const response = await this.getGptChatResponse(payload);
		if (!response.success) {
			return "";
		}
		return response.message;
	}

	hasApiKey(): boolean {
		return !!this.settings.openaiApiKey;
	}
}
