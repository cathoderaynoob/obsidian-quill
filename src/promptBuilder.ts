export interface Prompt {
	inputText?: string;
	templateText?: string;
	selectedText?: string;
	formattingGuidance?: string;
}

export const buildPrompt = ({
	inputText,
	templateText,
	selectedText,
	formattingGuidance,
}: Prompt): string => {
	if (templateText) {
		inputText = inputText ? `**User Prompt:**\n\n${inputText}` : "";
		templateText = templateText
			? `**Instruction for custom command:**\n*The user has selected the following 
				command template from a note in Obsidian. Follow the instruction in the
				user prompt with regard to the following text. If asked to ignore, simply respond 
				with some kind expression of understanding.*\n\n${templateText}`
			: "";
	}
	if (selectedText) {
		inputText = inputText ? `**User Prompt:**\n\n${inputText}` : "";
		selectedText = selectedText
			? `**Selected Text from Note:**\n*The user has selected the following 
				text from a note in Obsidian. Follow the instruction in the user prompt 
				with regard to the following text. If asked to ignore, simply respond 
				with some kind expression of understanding.*\n\n${selectedText}`
			: "";
	}
	formattingGuidance = formattingGuidance
		? `Formatting guidance: ${formattingGuidance}`
		: "";
	const prompt = [inputText, selectedText, formattingGuidance].filter(Boolean);

	// I don't know why I have to have the following interim
	// variable, but it doesn't work without it.
	const promptStr = prompt.join("\n\n").trim();

	return promptStr;
};
