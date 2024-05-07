export const ERROR_MESSAGES = {
	unknown: "An error occurred. Please check the console for details.",
	viewError: "Unable to open the GPT chat view. Please try again, or check the console for any errors.",
	noApiKey: "Your OpenAI API key is missing. Please enter it in the Obsidian GPT Plugin settings.",
	noEngines: "No engines found. More information can be found in the console.",
} as const;

export type ErrorCode = keyof typeof ERROR_MESSAGES;

export const GPT_VIEW_TYPE = "chat-view";
