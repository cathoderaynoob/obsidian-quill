import { normalizePath, Notice, TFile, TFolder, Vault } from "obsidian";
import { join } from "path";
import { format } from "date-fns";
import { IPluginServices } from "@/interfaces";
import { MessageType } from "@/components/Message";
import { QuillPluginSettings } from "@/settings";
import ModalSaveMessageAs from "@/components/ModalSaveMessageAs";

class VaultUtils {
  private static instance: VaultUtils;
  private pluginServices: IPluginServices;
  private settings: QuillPluginSettings;
  private vault: Vault;

  constructor(pluginServices: IPluginServices, settings: QuillPluginSettings) {
    this.pluginServices = pluginServices;
    this.settings = settings;
    this.vault = pluginServices.app.vault;
  }

  public static getInstance(
    pluginServices: IPluginServices,
    settings: QuillPluginSettings
  ): VaultUtils {
    if (!VaultUtils.instance) {
      VaultUtils.instance = new VaultUtils(pluginServices, settings);
    }
    return VaultUtils.instance;
  }

  // Returns a list of markdown files in a folder
  async getListOfMarkdownFilesByPath(folderPath: string) {
    const filesAndFolders = await this.vault.adapter.list(folderPath);
    const markdownFiles = filesAndFolders.files.filter((file) =>
      file.endsWith(".md")
    );
    return markdownFiles;
  }

  // Returns the filename of a file given its path
  getFilenameByPath(filePath: string): string | null {
    const file = this.vault.getAbstractFileByPath(filePath);
    if (file && file instanceof TFile) {
      return filePath.split("/").pop() || null;
    } else {
      this.pluginServices.notifyError(
        "fileNotFound",
        `File not found at \`${filePath}\`.`
      );
    }
    return null;
  }

  // Returns the file object given its path
  getFileByPath(filePath: string, suppressError?: boolean): TFile {
    const file = this.vault.getAbstractFileByPath(filePath) as TFile;
    if (!file && !suppressError) {
      this.pluginServices.notifyError(
        "fileNotFound",
        `File not found at \`${filePath}\`.`
      );
    }
    return file;
  }

  // Returns the folder object given its path
  getFolderByPath(folderPath: string): TFolder | null {
    const folder = this.vault.getFolderByPath(folderPath);
    if (!folder) {
      this.pluginServices.notifyError(
        "folderNotFound",
        `Folder not found at \`${folderPath}\`.`
      );
    }
    return folder;
  }

  // Returns an alphabetically sorted list of all folders in the vault
  getAllFolders() {
    const folders = this.vault
      .getAllLoadedFiles()
      .filter((file) => file instanceof TFolder) as TFolder[];
    return folders.map((folder) => folder.path).sort();
  }

  // Returns the content of a given file
  async getFileContent(file: TFile): Promise<string> {
    try {
      const content = this.vault.read(file);
      return content;
    } catch (e) {
      this.pluginServices.notifyError(
        "fileReadError",
        `Error reading file: ${file.path}`
      );
      return "";
    }
  }

  // Opens a file in the editor and returns a boolean indicating success
  async openFile(filepath: string, newLeaf?: boolean): Promise<boolean> {
    try {
      const leaf = this.pluginServices.app.workspace.getLeaf(newLeaf || false);
      const file = this.vault.getAbstractFileByPath(filepath) as TFile;
      if (file) {
        await leaf?.openFile(file); // Await the promise to ensure it completes
        return true; // Return true if the file is successfully opened
      } else {
        new Notice(`File not found: ${filepath}`);
        return false; // Return false if the file is not found
      }
    } catch (e) {
      new Notice(`Error opening file: ${e.message}`);
      console.log(e);
      return false; // Return false if an error occurs
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

  // Returns the filename from the first heading in a markdown file
  createFilenameFromTitle(content: string) {
    const headingRegex = /^(#+)\s+(.*)$/m;
    const match = content.match(headingRegex);
    return match ? match[2] : "";
  }

  private sanitizeFilename(filename: string) {
    const sanitized = normalizePath(filename)
      .replace(/[/\\]/g, "_") // Replace slashes with underscores
      .replace(/[^\w\s.-]/g, ""); // Remove disallowed characters
    return sanitized;
  }

  // SAVE A CONVERSATION
  getConversationsFolder(): string {
    const folderPath = this.settings.conversationsFolder;
    if (this.vault.getFolderByPath(folderPath) === null) {
      this.vault.createFolder(folderPath);
    }
    return folderPath;
  }

  async emptyFileContent(file: TFile): Promise<boolean> {
    await this.vault.modify(file, "");
    if ((await this.vault.read(file)) === "") {
      return true;
    }
    console.log(`Unable to clear file content from ${file.path}`);
    return false;
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

  async appendLatestMessageToConvFile(
    conversationId: string,
    latestMessage: MessageType
  ): Promise<string | null> {
    try {
      // Get conversation folder
      const folderPath = this.getConversationsFolder();
      // Find the conversation file, or create it
      const filename = `${conversationId}.md`;
      const filePath = `${folderPath}/${filename}`;
      let file = this.getFileByPath(filePath, true);
      if (!file) {
        file = await this.vault.create(filePath, "");
      }
      if (latestMessage.content.length) {
        const messageText = await this.formatLatestMessageForFile(
          latestMessage,
          file
        );
        // Append the latest message
        await this.vault.append(file, messageText);
      }
      return filename;
    } catch (e) {
      new Notice(e);
      console.log(e);
      return null;
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
      console.log("no file text length");
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
          const filepath = normalizePath(join(folderPath, filename));
          try {
            await this.vault.create(filepath, fileText);
            new Notice(`${filename}\n  saved to\n${folderPath}`);
            modal.close();
            this.settings.openSavedFile = openFile;
            await this.pluginServices.saveSettings();
            if (openFile) {
              this.openFile(filepath, true);
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
