import { Editor } from "obsidian";

export const renderToEditor = async (text: string, editor: Editor) => {
	return new Promise<void>((resolve) => {
		let { line, ch } = editor.getCursor();
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
			ch = 0;
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
