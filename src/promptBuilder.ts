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
	const prompt = [selectedText, inputText, formattingGuidance].filter(Boolean);
	
	// I don't know why I have to have the following interim
	// variable, but it doesn't work without it.
	const promptStr = prompt.join("\n\n").trim();

	return promptStr;
};
