export interface Prompt {
	inputText?: string;
	selectedText?: string;
	formattingGuidance?: string;
}

export const buildPrompt = ({
	inputText,
	selectedText,
	formattingGuidance,
}: Prompt): string => {
	if (selectedText) {
		inputText = inputText
			? `**User Input:**\n*Describe your question or instruction related to ` +
				`the selected text below.*\n\n` +
				`${inputText}`
			: "";
		selectedText = selectedText
			? `**Context from Note:**\n*This is the text you selected from your ` +
				`note. Please review to ensure it's relevant to your inquiry.*\n\n` +
				`${selectedText}`
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
