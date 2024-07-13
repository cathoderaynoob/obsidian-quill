import { Notice, Vault } from "obsidian";
import { format } from "date-fns";
import { IPluginServices } from "@/interfaces";
import { MessageType } from "@/components/Messages";
import { QuillPluginSettings } from "@/settings";

const createNewFileName = (fileExt: string) => {
	const now = format(Date.now(), "yyyy-MM-dd HH.mm.ss");
	return `${now}.${fileExt}`;
};

const formatChatForFile = (messages: MessageType[]): string => {
	let fileText = "";
	const msgsToFormat = [...messages];
	msgsToFormat.forEach((msg, i) => {
		let header = `##### `;
		const index = i + 1;
		const separator = `\n___\n`;
		switch (msg.role) {
			case "user":
				header += `» sent (${index})`;
				break;
			case "assistant":
				header += `« received (${index})\n\`${msg.model}\``;
				break;
		}
		fileText += `${header}\n\n${msg.content}\n`;
		if (msg.selectedText) {
			fileText += "\n```\n" + msg.selectedText + "\n```\n";
		}
		fileText += separator;
	});
	return fileText;
};

export const saveChatToFile = async (
	messages: MessageType[],
	vault: Vault,
	settings: QuillPluginSettings,
	pluginServices: IPluginServices
): Promise<string | null> => {
	const fileText = formatChatForFile(messages);
	if (!fileText.length) {
		pluginServices.notifyError("saveError");
		return null;
	}
	try {
		const folder = settings.vaultFolder;
		if (vault.getFolderByPath(folder) === null) {
			vault.createFolder(settings.vaultFolder);
		}
		const fileName = createNewFileName("md");
		const savedFile = await vault.create(`${folder}/${fileName}`, fileText);
		new Notice(
			`Conversation saved to\n\n  "${folder}"\n\nas\n\n  "${savedFile.name}"`
		);
		return savedFile.name;
	} catch (e) {
		console.log(e);
		return null;
	}
};
