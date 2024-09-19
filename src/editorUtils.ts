import { Editor, EditorPosition } from "obsidian";
import ApiService from "@/ApiService";

let keypressHandler: ((event: KeyboardEvent) => void) | null = null;

export const handleEditorKeypress = (
	event: KeyboardEvent,
	apiService?: ApiService
) => {
	if (event.key === "Escape") {
		event.preventDefault();
		apiService?.cancelStream();
	}
};

export const activateEditorKeypress = (
	editorElem: HTMLElement,
	apiService: ApiService
): void => {
	editorElem.addEventListener("keydown", (event: KeyboardEvent) =>
		handleEditorKeypress(event, apiService)
	);
};

export const deactivateEditorKeypress = (editorElem: HTMLElement): void => {
	if (keypressHandler) {
		editorElem.removeEventListener("keydown", keypressHandler);
		keypressHandler = null; // Clean up the reference
	}
};

export const renderToEditor = async (
	text: string,
	editor: Editor,
	editorPos: EditorPosition
) => {
	return new Promise<void>((resolve) => {
		let { line, ch } = editorPos || editor.getCursor("from");

		// Without a leading space, the markdown rendering timing
		// causes issues with the cursor position
		let addSpace = false;
		const nextChar = editor.getLine(line)[ch];
		if (nextChar && nextChar !== " ") {
			text += " ";
			addSpace = true;
		}

		editor.replaceRange(text, { line, ch });

		const numNewLines: number = [...text.matchAll(/\n/g)].length;
		if (numNewLines) {
			line += numNewLines;
			const lastNewLineIndex = text.lastIndexOf("\n");
			const charsAfterLastNewLine = text.slice(lastNewLineIndex + 1);
			ch = charsAfterLastNewLine.length;
		} else {
			ch += text.length;
			if (addSpace) {
				ch -= 1;
			}
		}

		editor.setCursor({ line, ch });
		resolve();
	});
};
