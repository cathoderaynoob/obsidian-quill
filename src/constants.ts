export const ERROR_MESSAGES = {
	unknown: "An unknown error occurred. Please check the console for more information.",
	noApiKey:
		"Please enter your OpenAI API key in the Obsidian GPT Plugin settings",
} as const;

export type ErrorCode = keyof typeof ERROR_MESSAGES;
