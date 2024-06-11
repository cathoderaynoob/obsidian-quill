export const ERROR_MESSAGES = {
  noApiKey:
  "Your OpenAI API key is missing. Please enter it in the Obsidian GPT " +
  "Plugin settings.",
	noEngines: "No engines found. More information can be found in the console.",
  noFeature: "Feature not found",
	unknown: "An error occurred. Please check the console for details.",
	viewError:
		"Unable to open the GPT chat view. Please try again, or check the " +
		"console for any errors.",
} as const;

export type ErrorCode = keyof typeof ERROR_MESSAGES;

export const GPT_VIEW_TYPE = "gpt-chat-view";

export const APP_ICON = "bird";

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
      "where it will improve readability and impact. Use sparingly.",
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
		content: '<= Define this term in the following format:\n' +
			'###### <term> `<Pronunciation in International Phonetic Alphabet (IPA)>`\n\n' +
			'<Definition, or *only if more than one*, enumerated definitions>\n\n' +
			'- *Example*: "<Use the term in a sentence>"',
	},
	tellAJoke: {
		role: "user",
		content:
			"Tell me a joke (and only the joke) in the style of Anthony Jeselnik.",
	},
};

