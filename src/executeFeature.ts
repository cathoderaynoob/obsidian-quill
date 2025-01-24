import { Editor, normalizePath, TFile } from "obsidian";
import { PROMPTS } from "@/constants";
import {
	GptRequestPayload,
	PayloadMessagesType,
	OutputTarget,
} from "@/interfaces";
import { buildPrompt } from "@/promptBuilder";
import { FeatureProperties } from "@/featuresRegistry";
import { QuillPluginSettings } from "@/settings";
import { IPluginServices } from "@/interfaces";
import {
	activateEditorKeypress,
	deactivateEditorKeypress,
} from "@/editorUtils";
import ApiService from "@/ApiService";
import emitter from "@/customEmitter";
import PayloadMessages from "@/PayloadMessages";
import VaultUtils from "@/VaultUtils";

export interface ExecutionOptions {
	id: string;
	inputText?: string;
	selectedText?: string;
	templateFilename?: string; // template =====================================
	formattingGuidance?: string;
	outputTarget?: OutputTarget;
}

export const executeFeature = async (
	featureRegistry: Record<string, FeatureProperties>,
	options: ExecutionOptions,
	settings: QuillPluginSettings,
	apiService: ApiService,
	payloadMessages: PayloadMessages,
	pluginServices: IPluginServices
): Promise<void> => {
	// options
	const {
		id,
		inputText,
		selectedText,
		templateFilename, // template < ============================================
		formattingGuidance,
		outputTarget,
	} = options;
	const vaultUtils = VaultUtils.getInstance(pluginServices, settings);
	const feature = featureRegistry[id];
	console.log(feature);
	if (!feature) {
		pluginServices.notifyError("noFeature");
		return;
	}
	// TEMPLATE FILE ============================================================
	let commandTemplateContent: string | undefined;
	if (templateFilename) {
		// Read from template file
		const templateFilePath = normalizePath(
			`${settings.templatesFolder}/${templateFilename}`
		);
		const templateFile: TFile = vaultUtils.getFileByPath(templateFilePath);
		commandTemplateContent = await vaultUtils.getFileContent(templateFile);
		console.log(commandTemplateContent);
	}
	// ^ =========================================================================

	const payloadPrompt = buildPrompt({
		inputText: feature.prompt(inputText) || undefined,
		templateText: commandTemplateContent || undefined, // < ====================
		selectedText: selectedText || undefined,
		formattingGuidance: formattingGuidance || undefined,
	});
	if (!payloadPrompt) return; // Prevent empty requests

	let payloadMessagesArray: PayloadMessagesType[] = [];
	const newPayloadMessage: PayloadMessagesType = {
		role: "user",
		content: payloadPrompt,
	};

	if (feature.outputTarget === "view") {
		const emitEvent = (
			event: string,
			role: string,
			prompt?: string,
			selectedText?: string,
			filePath?: string
		): Promise<void> => {
			return new Promise<void>((resolve) => {
				emitter.emit(event, role, prompt, selectedText);
				resolve();
			});
		};
		await emitEvent("newMessage", "user", inputText, selectedText);
		if (payloadMessages.getAll().length === 0) {
			const today = new Date().toLocaleDateString("en-US", {
				month: "long",
				day: "numeric",
				year: "numeric",
			});
			const systemMsg: PayloadMessagesType = {
				role: "system",
				content: `Today is ${today}. ${PROMPTS.systemInitial.content}`,
			};
			payloadMessagesArray = payloadMessages.addMessage(systemMsg);
		}
		payloadMessagesArray = payloadMessages.addMessage(newPayloadMessage);
		await emitEvent("newMessage", "assistant");
	} else {
		payloadMessagesArray = [newPayloadMessage];
	}

	const payload: GptRequestPayload = {
		model: feature.model || settings.openaiModel,
		messages: payloadMessagesArray,
		temperature: feature.temperature || settings.openaiTemperature,
	};

	if (feature.stream) {
		let editorElem: HTMLElement | null = null;
		if (outputTarget instanceof Editor) {
			setTimeout(() => {
				editorElem = document.querySelector(".cm-editor.cm-focused");
				if (editorElem) {
					editorElem.id = "oq-streaming";
					activateEditorKeypress(editorElem, apiService);
				}
			}, 100);
		}
		const completedResponse = await apiService.getStreamingChatResponse(
			payload,
			feature.processResponse,
			outputTarget
		);
		if (feature.outputTarget === "view") {
			payloadMessages.addMessage({
				role: "assistant",
				content: completedResponse,
			});
		}
		if (editorElem) {
			(editorElem as HTMLElement).id = "";
			deactivateEditorKeypress(editorElem);
		}
	} else {
		await apiService.getNonStreamingChatResponse(
			payload,
			feature.processResponse,
			outputTarget
		);
	}
};
