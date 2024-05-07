import { Editor } from "obsidian";
import {
	ContainerType,
	GptEngines,
	GptRequestPayload,
	IPluginServices,
} from "@/interfaces";
import { GptPluginSettings } from "@/settings";

export default class ApiService {
	pluginServices: IPluginServices;
	settings: GptPluginSettings;

	constructor(pluginServices: IPluginServices, settings: GptPluginSettings) {
		this.pluginServices = pluginServices;
		this.settings = settings;
	}

	async getStreamingChatResponse(
		payload: GptRequestPayload,
		callback?: (text: string, container?: ContainerType) => void,
		container?: ContainerType
	): Promise<string> {
		const apiUrl = this.settings.openaiChatUrl;

		const requestOptions = this.setupRequestOptions("POST", payload);
		if (!requestOptions) return "";

		try {
			const response = await fetch(apiUrl, requestOptions);
			if (!response.body) {
				this.pluginServices.notifyError("unknown", "No response body.");
				return "";
			}
			const reader = response.body.getReader();
			const decoder = new TextDecoder();
			let isReading = true;

			while (isReading) {
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
						const streamingContent = parsed.choices[0]?.delta?.content;
						if (streamingContent) {
							if (!callback) {
								return streamingContent.toString();
							}
							callback(
								streamingContent.toString(),
								container ? container : undefined
							);
						}
					} catch (error) {
						this.pluginServices.notifyError("unknown", "JSON parse error.");
						return "";
					}
				}
			}
		} catch (error) {
			this.pluginServices.notifyError("unknown", `Fetch error: ${error}`);
		}
		return "";
	}

	async getStandardChatResponse(
		payload: GptRequestPayload,
		callback?: (text: string, container?: ContainerType) => void,
		container?: ContainerType
	): Promise<string> {
		const apiUrl = this.settings.openaiChatUrl;

		const requestOptions = this.setupRequestOptions("POST", payload);
		if (!requestOptions) return "";

		try {
			const response = await fetch(apiUrl, requestOptions);
			if (!response.ok) {
				this.pluginServices.notifyError(
					"unknown",
					`HTTP error status: ${response.status}`
				);
			} else {
				const data = await response.json();
				const standardContent = data.choices[0].message.content;
				if (standardContent) {
					if (!callback) {
						return standardContent.toString();
					}
					callback(
						standardContent.toString(),
						container ? container : undefined
					);
				} else {
					this.pluginServices.notifyError(
						"unknown",
						"No content in response data."
					);
				}
			}
		} catch (error) {
			this.pluginServices.notifyError("unknown", `Fetch error: ${error}`);
		}
		return "";
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

	private setupRequestOptions(
		method: string,
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

	renderToEditor(text: string, editor: Editor): void {
		let lineNum = editor.getCursor().line;
		let charNum = editor.getLine(lineNum).length;

		editor.replaceRange(text, {
			line: lineNum,
			ch: charNum,
		});

		const numReturns: number = [...text.matchAll(/\n/g)].length;
		if (numReturns) {
			lineNum += numReturns;
			charNum = 0;
		} else {
			charNum += text.length;
		}
		editor.setCursor({
			line: lineNum,
			ch: charNum,
		});
	}
}
