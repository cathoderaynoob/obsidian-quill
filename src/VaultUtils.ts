import { normalizePath, Notice, TFile, TFolder, Vault } from "obsidian";
import * as os from "os";
import { join } from "path";
import { format } from "date-fns";
import { FILENAME_CHAR_REPLACEMENTS } from "@/constants";
import { IPluginServices } from "@/interfaces";
import { QuillPluginSettings } from "@/settings";

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

  // Create a file in the vault
  createFile = async (path: string, content: string): Promise<TFile> => {
    return this.vault.create(path, content);
  };

  // Create a folder in the vault
  createFolder = async (path: string): Promise<TFolder> => {
    return this.vault.createFolder(path);
  };

  // Append content to a file
  appendToFile = async (file: TFile, content: string): Promise<void> => {
    return this.vault.append(file, content);
  };

  // Returns a list of markdown files in a folder
  getListOfMarkdownFilesByPath = async (folderPath: string) => {
    const filesAndFolders = await this.vault.adapter.list(folderPath);
    const markdownFiles = filesAndFolders.files.filter((file) =>
      file.endsWith(".md")
    );
    return markdownFiles;
  };

  // Returns the filename of a file given its path
  getFilenameByPath = (filePath: string): string | null => {
    const file = this.vault.getAbstractFileByPath(filePath);
    if (file && file instanceof TFile) {
      return filePath.split("/").pop() || null;
    }
    this.pluginServices.notifyError(
      "fileNotFound",
      `File not found at \`${filePath}\`.`
    );
    return null;
  };

  // Returns normalized path to file
  getNormalizedFilepath = (folderPath: string, filename: string): string => {
    return normalizePath(join(folderPath, filename));
  };

  // Returns the file object given its path
  getFileByPath = (filePath: string, suppressError?: boolean): TFile | null => {
    const file = this.vault.getAbstractFileByPath(filePath);
    if (file instanceof TFile) return file;
    if (!suppressError)
      this.pluginServices.notifyError(
        "fileNotFound",
        `File not found at \`${filePath}\`.`
      );
    return null;
  };

  // Returns the folder object given its path
  getFolderByPath = (
    folderPath: string,
    suppressError?: boolean
  ): TFolder | null => {
    const folder = this.vault.getFolderByPath(folderPath);
    if (folder) return folder;
    if (!suppressError)
      this.pluginServices.notifyError(
        "folderNotFound",
        `Folder not found at \`${folderPath}\`.`
      );
    return null;
  };

  // Sort the provided folder paths alphabetically
  sortFolderPaths = (folders: TFolder[]): string[] => {
    folders.map((folder) => folder.path);
    return folders
      .map((folder) => folder.path)
      .sort((a, b) => a.localeCompare(b));
  };

  // Returns an alphabetically sorted list of all folders in the vault
  getAllFolderPaths = (): string[] => {
    const folders = this.vault
      .getAllLoadedFiles()
      .filter((file): file is TFolder => file instanceof TFolder);
    return this.sortFolderPaths(folders);
  };

  // Returns the content of a given file
  getFileContent = async (file: TFile): Promise<string> => {
    try {
      const content = this.vault.read(file);
      return content;
    } catch (e) {
      this.pluginServices.notifyError("fileReadError", e);
      return "";
    }
  };

  // Opens a file in the editor and returns a boolean indicating success
  openFile = async (filepath: string, newLeaf?: boolean): Promise<boolean> => {
    try {
      const leaf = this.pluginServices.app.workspace.getLeaf(newLeaf || false);
      const file = this.vault.getAbstractFileByPath(filepath);
      if (leaf && file instanceof TFile) {
        await leaf.openFile(file); // Await the promise to ensure it completes
        return true; // Return true if the file is successfully opened
      } else {
        new Notice(`File not found: ${filepath}`);
        return false; // Return false if the file is not found
      }
    } catch (e) {
      new Notice(`Error opening file: ${e.message}`);
      console.error(e);
      return false; // Return false if an error occurs
    }
  };

  getDateTime = () => {
    return format(Date.now(), "yyyy-MM-dd HH.mm.ss");
  };

  createFilenameAsDatetime = (fileExt?: string) => {
    fileExt = fileExt || "md"; // Default file type
    const now = this.getDateTime();
    return `${now}.${fileExt}`;
  };

  // Returns the filename from the first heading in a markdown file
  createFilenameFromTitle = (content: string) => {
    const headingRegex = /^(#+)\s+(.*)$/m;
    const match = content.match(headingRegex);
    return match ? match[2] : "";
  };

  // Returns a map of bad → good filename chars based on OS
  getMapFilenameCharReplacements = (): Record<string, string> => {
    let platform: string;
    try {
      platform = os.platform();
    } catch {
      platform = "win32"; // Default to Windows if platform detection fails
    }
    const replacements = FILENAME_CHAR_REPLACEMENTS;
    return (
      replacements[platform as keyof typeof replacements] || replacements.win32
    );
  };

  // Returns filename with all valid chars for the OS used
  sanitizeFilename = (filename: string): string => {
    const replacements = this.getMapFilenameCharReplacements();
    // Replace forbidden characters using the mapping
    const sanitized = filename
      .split("")
      .map((char) =>
        replacements[char] !== undefined ? replacements[char] : char
      )
      .join("");
    return sanitized.trim();
  };

  // Returns a sanitized filename, whether provided by user, or generated
  getValidFilename = (filename?: string) => {
    filename = filename?.length ? filename : this.createFilenameAsDatetime();
    const sanitizedFilename = this.sanitizeFilename(
      filename.endsWith(".md") ? filename : filename + ".md"
    );
    return sanitizedFilename;
  };

  // Remove all content from the file provided. Returns success
  emptyFileContent = async (file: TFile): Promise<boolean> => {
    await this.vault.modify(file, "");
    if ((await this.vault.read(file)) === "") {
      return true;
    }
    return false;
  };
}

export default VaultUtils;
