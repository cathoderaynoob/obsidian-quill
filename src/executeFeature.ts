import { Editor } from "obsidian";
import { PROMPTS } from "@/constants";
import { GptRequestPayload, PayloadMessagesType } from "@/interfaces";
import { buildPrompt } from "@/promptBuilder";
import { FeatureProperties } from "@/featureRegistry";
import { QuillPluginSettings } from "@/settings";
import { IPluginServices } from "@/interfaces";
import ApiService from "@/ApiService";
import emitter from "@/customEmitter";
import PayloadMessages from "@/PayloadMessages";

export interface ExecutionOptions {
	id: string;
	inputText?: string;
	selectedText?: string;
	formattingGuidance?: string;
	targetEditor?: Editor;
}

export const executeFeature = async (
	featureRegistry: Record<string, FeatureProperties>,
	options: ExecutionOptions,
	settings: QuillPluginSettings,
	apiService: ApiService,
	payloadMessages: PayloadMessages,
	pluginServices: IPluginServices
): Promise<void> => {
	const { id, inputText, selectedText, formattingGuidance, targetEditor } =
		options;
	const feature = featureRegistry[id];
	if (!feature) {
		pluginServices.notifyError("noFeature");
		return;
	}

	const payloadPrompt = buildPrompt({
		inputText: feature.prompt(inputText) || undefined,
		selectedText: selectedText || undefined,
		formattingGuidance: formattingGuidance || undefined,
	});
	if (!payloadPrompt) return; // Prevent empty requests

	let payloadMessagesArray: PayloadMessagesType[] = [];
	const newPayloadMessage: PayloadMessagesType = {
		role: "user",
		content: payloadPrompt,
	};

	if (feature.targetContainer === "view") {
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
		await pluginServices.toggleView();
		if (payloadMessages.getPayloadMessages().length === 0) {
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
		const completedResponse = await apiService.getStreamingChatResponse(
			payload,
			feature.processResponse,
			targetEditor
		);
		if (feature.targetContainer === "view") {
			payloadMessages.addMessage({
				role: "assistant",
				content: completedResponse,
			});
		}
	} else {
		await apiService.getStandardChatResponse(
			payload,
			feature.processResponse,
			targetEditor
		);
	}
};
