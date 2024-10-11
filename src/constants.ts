export const APP_PROPS = {
	appName: "Quill",
	appIcon: "feather",
	sendIcon: "bird",
};
export const ELEM_IDS = {
	messagePad: "oq-message-pad",
	messages: "oq-messages",
	newConversation: "oq-btn-new-conv",
};
export const ERROR_MESSAGES = {
	noApiKey:
		"Your OpenAI API key is missing. Please enter it in the " +
		"community plugin settings for Quill.",
	noEngines: "No engines found. More information can be found in the console.",
	noFeature: "Feature not found",
	saveError: "Unable to save to a note. Please check the console for details.",
	unknown: "An error occurred. Please check the console for details.",
	viewError:
		"Unable to open Quill. Please try again, or check the " +
		"console for any errors.",
} as const;
export type ErrorCode = keyof typeof ERROR_MESSAGES;
export const QUILL_VIEW_TYPE = "quill-chat-view";
export const SCROLL_CHARS_LIMIT = 400;
export const STREAM_BUFFER_LIMIT = 300;
export const PROMPTS = {
	systemInitial: {
		role: "system",
		content:
			"You are an assistant integrated into Obsidian, a powerful note-taking " +
			"application. Your primary objective is to function as a research " +
			"assistant. Provide answers that are clear, concise, and accurate. Based " +
			"on user conversations, generate well-structured notes. Adhere to any " +
			"provided template guidelines. Maintain a matter-of-fact and reserved " +
			"tone. Correct any faulty presumptions detected in user inputs.\n\n" +
			"Formatting Instructions:\n\nStyle your response in markdown format " +
			"where it will improve readability and impact. Use sparingly. " +
			"Do not add conversation preamble, summaries, or labels when asked " +
			"for specific content, since the entire output will be copied directly " +
			"to a note. ALWAYS REPLY, EVEN WHEN TESTING.",
	},
	onThisDate: {
		role: "user",
		content:
			"Tell me one thing from history in one paragraph that happened on this date, " +
			"interesting, significant, or funny. Start with `On **<MMMM D, YYYY>**,`." +
			"Make sure the date is bold. Italicize important or prominent persons, " +
			"places, events, etc. This response is going into a note, so to create a " +
			"separation from other text, append the response with 2 newline chars, " +
			"3 underscores, and 2 more newline chars, i.e. `\n\n___\n\n`.",
	},
	define: {
		role: "user",
		content:
			"<= [Define this term in the format of the following example.\n" +
			"If proper noun, use title case. Otherwise always use lower case.\n" +
			"Please provide multiple definitions when appropriate.\n\n" +
			"##### term\n" +
			"`/tɜrm/`\n\n" +
			"1. *[part of speech]* A word or phrase used to describe a thing or to express " +
			"a concept, especially in a particular kind of language or " +
			"branch of study.\n" +
			"   - *Example*: \"The term 'photosynthesis' is commonly used " +
			'     in biology."\n' +
			"2. A fixed or limited period for which something, such as " +
			"an office, imprisonment, or investment, lasts or is " +
			"intended to last.\n" +
			"   - *Example*: \"The president's term in office is four " +
			'     years."\n' +
			"3. ...\n\n" +
			"[Important: After last definition, include one newline character.]",
	},
	tellAJoke: {
		role: "user",
		content:
			"Tell me a joke (and only the joke) in the style of Anthony Jeselnik.",
	},
};
