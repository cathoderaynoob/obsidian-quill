export const ERROR_MESSAGES = {
	noApiKey:
		"Your OpenAI API key is missing. Please enter it in the " +
		"community plugin settings for Quill.",
	noEngines: "No engines found. More information can be found in the console.",
	noFeature: "Feature not found",
	unknown: "An error occurred. Please check the console for details.",
	viewError:
		"Unable to open Quill. Please try again, or check the " +
		"console for any errors.",
} as const;

export type ErrorCode = keyof typeof ERROR_MESSAGES;

export const QUILL_VIEW_TYPE = "quill-chat-view";

export const APP_PROPS = {
	appName: "Quill",
	appIcon: "feather",
	sendIcon: "bird",
};

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
			"for specific content, since the output will be used directly in a note.",
	},
	onThisDate: {
		role: "user",
		content:
			"Tell me one thing from history in one paragraph that happened on this date, " +
			"interesting, significant, or funny. Start with `On **<MMMM D, YYYY>**,`. " +
			"Italicize important or prominent persons, places, events, etc. This response " +
			"is going into a note, so to create a separation from other text, append the " +
			"response with 2 newline chars, 3 underscores, and 2 more newline chars, " +
			"i.e. `\n\n___\n\n`.",
	},
	define: {
		role: "user",
		content:
			"<= Define this term in the following format.\n\n" +
			"###### <term, lowercase unless proper noun, etc.> `/<Pronunciation in " +
			"International Phonetic Alphabet (IPA)>/`\n\n" +
			"<Definition. If more than one, enumerate.>\n\n" +
			'<For each defn:> - *Example*: "<Use the term in a sentence>"\n\n' +
			"Finally, add 2 newline chars, i.e. `\n\n`.",
	},
	tellAJoke: {
		role: "user",
		content:
			"Tell me a joke (and only the joke) in the style of Anthony Jeselnik.",
	},
};
