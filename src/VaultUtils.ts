import { Notice, TFile, TFolder, Vault } from "obsidian";
import { format } from "date-fns";
import { IPluginServices } from "@/interfaces";
import { MessageType } from "@/components/Message";
import { QuillPluginSettings } from "@/settings";
import ModalSaveMessageAs from "@/components/ModalSaveMessageAs";

class VaultUtils {
	private static instance: VaultUtils;
	private pluginServices: IPluginServices;
	private vault: Vault;
	private settings: QuillPluginSettings;

	constructor(
		pluginServices: IPluginServices,
		vault: Vault,
		settings: QuillPluginSettings
	) {
		this.pluginServices = pluginServices;
		this.vault = vault;
		this.settings = settings;
	}

	public static getInstance(
		pluginServices: IPluginServices,
		vault: Vault,
		settings: QuillPluginSettings
	): VaultUtils {
		if (!VaultUtils.instance) {
			VaultUtils.instance = new VaultUtils(pluginServices, vault, settings);
		}
		return VaultUtils.instance;
	}

	getAllFolders() {
		const folders = this.vault
			.getAllLoadedFiles()
			.filter((file) => file instanceof TFolder) as TFolder[];
		return folders.map((folder) => folder.path).sort();
	}

	openFile(filepath: string) {
		try {
			const leaf = this.pluginServices.app.workspace.getLeaf();
			const file = this.vault.getAbstractFileByPath(filepath) as TFile;
			if (file) {
				leaf?.openFile(file);
			}
		} catch (e) {
			new Notice(e);
			console.log(e);
		}
	}

	getDateTime() {
		return format(Date.now(), "yyyy-MM-dd HH.mm.ss");
	}

	createFilenameAsDatetime(fileExt?: string) {
		fileExt = fileExt || "md"; // Default file type
		const now = this.getDateTime();
		return `Quill ${now}.${fileExt}`;
	}

	createFilenameFromTitle(content: string) {
		const headingRegex = /^(#+)\s+(.*)$/m;
		const match = content.match(headingRegex);
		return match ? match[2] : "";
	}

	private sanitizeFilename(filename: string) {
		const isWindows = navigator.platform.startsWith("Win");
		let sanitized = filename
			.replace(/[/\\]/g, "_") // Replace slashes with underscores
			.replace(/[^\w\s.-]/g, ""); // Remove disallowed characters
		if (isWindows) {
			sanitized = sanitized.replace(/"/g, ""); // Remove `"` if Windows
		}
		return sanitized;
	}

	// SAVE A CONVERSATION
	getConversationsFolder() {
		const folder = this.settings.conversationsFolder;
		if (this.vault.getFolderByPath(folder) === null) {
			this.vault.createFolder(folder);
		}
		return;
	}

	private async formatLatestMessageForFile(
		msg: MessageType,
		file: TFile
	): Promise<string> {
		const fileContent = await this.vault.read(file);
		const matches = fileContent.match(/\[Message \d+\]/g)?.length || 0;
		const messageNum = matches + 1;
		let header = msg.role === "user" ? `# [Message ${messageNum}]\n` : "";
		const separator = `\n___\n`;
		switch (msg.role) {
			case "user":
				header += `#### [» Prompt]`;
				break;
			case "assistant":
				header += `#### [« Response]\n\`${msg.model}\``;
				break;
		}
		let fileText = `${header}\n\n${msg.content}\n`;
		if (msg.selectedText) {
			fileText += "\n```\n" + msg.selectedText + "\n```\n";
		}
		fileText += separator;

		return fileText;
	}

	async appendLatestMessageToFile(
		conversationId: string,
		latestMessage: MessageType
	): Promise<boolean> {
		if (!latestMessage.content.length) return false;
		try {
			// Get conversation folder
			const folder = this.settings.conversationsFolder;
			if (this.vault.getFolderByPath(folder) === null) {
				this.vault.createFolder(folder);
			}
			// Set the filename
			const filename = `${conversationId}.md`;
			const filePath = `${folder}/${filename}`;
			let file = this.vault.getFileByPath(filePath);
			// Does the file already exist?
			if (!file) {
				file = await this.vault.create(filePath, "");
			}
			const messageText = await this.formatLatestMessageForFile(
				latestMessage,
				file
			);
			if (!messageText.length) {
				this.pluginServices.notifyError("saveError");
				return false;
			}
			// Append the latest message
			await this.vault.append(file, messageText);
			return true;
		} catch (e) {
			new Notice(e);
			console.log(e);
			return false;
		}
	}

	// SAVE A MESSAGE TO A FILE AS...
	async saveMessageAs(
		message: string,
		settings: QuillPluginSettings
	): Promise<{ filename: string; path: string } | null> {
		const fileText = message;
		if (!fileText.length) {
			this.pluginServices.notifyError("saveError");
			return null;
		}

		return new Promise((resolve) => {
			const modal = new ModalSaveMessageAs(
				this.pluginServices.app,
				this.settings,
				message,
				this.getAllFolders().sort(),
				async (fileName, folderPath, openFile) => {
					if (!fileName.length) {
						fileName = this.createFilenameAsDatetime();
					}
					const filename = this.sanitizeFilename(
						fileName.endsWith(".md") ? fileName : fileName + ".md"
					);
					const filepath = `${folderPath}/${filename}`;
					try {
						await this.vault.create(filepath, fileText);
						new Notice(`${filename}\n  saved to\n${folderPath}`);
						modal.close();
						this.settings.openSavedFile = openFile;
						await this.pluginServices.saveSettings();
						if (openFile) {
							this.openFile(filepath);
						}
						resolve({ filename, path: folderPath });
					} catch (e) {
						new Notice(e);
						console.log(e);
					}
				}
			);
			modal.open();
		});
	}
}

export default VaultUtils;
