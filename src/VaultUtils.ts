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

	createFilenameAsDatetime(fileExt: string) {
		const now = format(Date.now(), "yyyy-MM-dd HH.mm.ss");
		return `${now}.${fileExt}`;
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

	getAllFolders(vault: Vault) {
		const folders = vault
			.getAllLoadedFiles()
			.filter((file) => file instanceof TFolder) as TFolder[];
		return folders.map((folder) => folder.path).sort();
	}

	private formatConversationForFile(messages: MessageType[]): string {
		let fileText = "";
		const msgsToFormat = [...messages];
		msgsToFormat.forEach((msg, i) => {
			let header = `# `;
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
	}

	async saveConversationToFile(
		messages: MessageType[],
		vault: Vault,
		settings: QuillPluginSettings,
		pluginServices: IPluginServices
	): Promise<string | null> {
		const fileText = this.formatConversationForFile(messages);
		if (!fileText.length) {
			pluginServices.notifyError("saveError");
			return null;
		}
		try {
			const folder = settings.conversationsFolder;
			if (vault.getFolderByPath(folder) === null) {
				vault.createFolder(folder);
			}
			const fileName = this.createFilenameAsDatetime("md");
			const savedFile = await vault.create(`${folder}/${fileName}`, fileText);
			new Notice(
				`Conversation saved to\n  "${folder}"\nas\n  "${savedFile.name}"`
			);
			return savedFile.name;
		} catch (e) {
			new Notice(e);
			console.log(e);
			return null;
		}
	}

	async saveMessageAs(
		message: string,
		vault: Vault,
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
				vault,
				message,
				this.getAllFolders(vault).sort(),
				async (fileName, folderPath, openFile) => {
					const filename = this.sanitizeFilename(
						fileName.endsWith(".md") ? fileName : fileName + ".md"
					);
					const filepath = `${folderPath}/${filename}`;
					try {
						await vault.create(filepath, fileText);
						new Notice(`${filename}\n  saved to\n${folderPath}`);
						modal.close();
						if (openFile) {
							this.openFile(vault, filepath);
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

	openFile(vault: Vault, filepath: string) {
		try {
			const leaf = this.pluginServices.app.workspace.getLeaf();
			const file = vault.getAbstractFileByPath(filepath) as TFile;
			if (file) {
				leaf?.openFile(file);
			}
		} catch (e) {
			new Notice(e);
			console.log(e);
		}
	}
}

export default VaultUtils;
