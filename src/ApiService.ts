import OpenAI from "openai";
import { Editor, EditorPosition, TFile, Vault } from "obsidian";
import { GptRequestPayload, IPluginServices, OutputTarget } from "@/interfaces";
import { QuillPluginSettings } from "@/settings";
import { STREAM_BUFFER_LIMIT } from "@/constants";
import emitter from "@/customEmitter";
import PayloadMessages from "@/PayloadMessages";

export default class ApiService {
	pluginServices: IPluginServices;
	settings: QuillPluginSettings;
	openai: OpenAI;
	payloadMessages: PayloadMessages;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	streamingContent: any | null = null;
	vault: Vault;

	constructor(pluginServices: IPluginServices, settings: QuillPluginSettings) {
		this.pluginServices = pluginServices;
		this.settings = settings;
		this.openai = new OpenAI({
			apiKey: this.settings.openaiApiKey,
			dangerouslyAllowBrowser: true,
		});
		this.payloadMessages = PayloadMessages.getInstance();
		this.vault = pluginServices.app.vault;
	}

	hasApiKey(): boolean {
		return !!this.settings.openaiApiKey;
	}

	// CHAT =====================================================================
	async getStreamingChatResponse(
		payload: GptRequestPayload,
		callback: (
			response: string,
			outputTarget?: OutputTarget,
			editorPos?: EditorPosition
		) => void,
		outputTarget?: OutputTarget
	): Promise<string> {
		const bufferLimit = STREAM_BUFFER_LIMIT;
		let bufferedContent = "";
		let completedMessage = "";
		let lastEditorPos: EditorPosition | null = null;

		const bufferContent = (content: string, editor: Editor) => {
			if (!lastEditorPos) {
				lastEditorPos = editor.getCursor();
			}
			bufferedContent += content;
			if (bufferedContent.length >= bufferLimit) {
				callback(bufferedContent, outputTarget, lastEditorPos);
				lastEditorPos = editor.getCursor();
				bufferedContent = "";
			}
		};

		try {
			this.streamingContent = await this.openai.chat.completions.create({
				model: payload.model,
				messages: payload.messages,
				stream: true,
				temperature: payload.temperature,
			});

			for await (const chunk of this.streamingContent) {
				const content = chunk.choices[0]?.delta?.content;
				if (typeof content === "string") {
					if (outputTarget instanceof Editor) {
						bufferContent(content, outputTarget);
					} else {
						callback(content);
					}
					completedMessage += content;
				}
			}
		} catch (error) {
			this.pluginServices.notifyError("unknown", error);
			return "";
		} finally {
			if (outputTarget && bufferedContent.length > 0) {
				callback(bufferedContent, outputTarget);
			}
			// Give completedMessage time to be return before emitting streamEnd
			setTimeout(() => {
				emitter.emit("streamEnd");
				emitter.emit("modalStreamEnd");
			}, 150);
		}
		return completedMessage;
	}

	cancelStream() {
		this.streamingContent?.controller?.abort();
		this.streamingContent = null;
	}

	// TODO: Update this to possibly return string instead of void
	async getNonStreamingChatResponse(
		payload: GptRequestPayload,
		callback: (text: string, outputTarget?: OutputTarget) => void,
		outputTarget?: OutputTarget
	): Promise<void> {
		try {
			const completion = await this.openai.chat.completions.create({
				model: payload.model,
				messages: payload.messages,
				temperature: payload.temperature,
			});
			if (completion.choices[0]?.message?.content) {
				callback(
					completion.choices[0]?.message?.content,
					outputTarget || undefined
				);
			}
		} catch (error) {
			this.pluginServices.notifyError("unknown", error);
		}
	}

	// FILES ====================================================================
	async retrieveFileInfoFromOpenAI(
		file_id: string
	): Promise<OpenAI.FileObject | false> {
		if (!file_id) {
			this.pluginServices.notifyError(
				"fileNotFound",
				"Unable to check for file: no `file_id` value provided."
			);
			return false;
		}

		const fileInfo = await this.openai.files.retrieve(file_id);
		console.log(fileInfo);
		return fileInfo || false;
	}

	async uploadFileFromVault(
		file: TFile,
		purpose: OpenAI.FilePurpose
	): Promise<string | undefined> {
		if (!file) {
			this.pluginServices.notifyError(
				"fileUploadError",
				"No file provided to upload."
			);
			return;
		}
		const fileContent = await this.vault.adapter.read(file.path);
		const uploadableFile = new File([fileContent], file.name, {
			type: "text/markdown",
		});

		if (uploadableFile) {
			try {
				const uploadResponse = await this.openai.files.create({
					file: uploadableFile,
					purpose: purpose,
				});
				console.log("File uploaded:", uploadResponse);
				return uploadResponse.id;
			} catch (error) {
				console.error("Error uploading file:", error);
			}
		} else {
			this.pluginServices.notifyError(
				"fileUploadError",
				`Error reading file ${file.path}`
			);
			return;
		}
	}
}
