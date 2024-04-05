# Obsidian GPT Plugin

This Obsidian plugin brings the power of OpenAI's GPT to your note-taking workflow, allowing you to generate AI-powered content directly within Obsidian. Whether you're looking for a joke in the style of Louis CK or interesting historical facts, this plugin enhances your notes with intelligent and customizable text insertions.

## Features

-   **GPT-Powered Content**: Leverage the latest GPT models to generate content tailored to your queries.
-   **Insert Jokes**: Get jokes in the style of famous comedians inserted directly into your notes.
-   **On This Date**: Discover and insert fascinating historical facts for any given day.
-   **Custom GPT Prompts**: Use the plugin to send custom prompts to the GPT API and insert the responses into your notes.

## Installation

### From GitHub

1. Download the latest release from the GitHub [releases page](https://github.com/your-username/your-repo-name/releases).
2. In Obsidian, open the settings pane by clicking on the gear icon in the lower-left corner.
3. Go to `Community Plugins` and disable `Safe Mode`.
4. Click on `Browse` and then on `Install Plugin`. Choose the downloaded zip file.
5. After the installation is complete, activate the plugin by toggling it on in the `Community Plugins` tab.

### Manual Installation

1. Create a `your-plugin-name` folder inside `.obsidian/plugins` in your vault.
2. Copy over the `main.js`, `manifest.json`, and `styles.css` (if present) files from the release into the new folder.
3. Reload Obsidian or restart the app.
4. Enable the plugin from the `Community Plugins` tab in Obsidian settings, as mentioned above.

## Usage

-   **Insert a Joke**: Access the Command Palette (`Ctrl+P` or `Cmd+P` on macOS) and search for "Tell me a joke". Select it to generate and insert a joke at the current cursor position in your active note.
-   **On This Date**: Use the Command Palette and search for "On This Date...". Select it to insert an interesting fact about the current date into your note.

## Configuration

After installation, navigate to the plugin settings tab to enter your OpenAI API key and select your preferred GPT model. These settings are crucial for the plugin to function correctly.

## Acknowledgments

This plugin utilizes the OpenAI API to generate content. A valid OpenAI API key is required for use.

## Disclaimer

This plugin is not officially affiliated with Obsidian or OpenAI. It is developed and maintained by independent contributors. Use at your own risk.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Contributing

Contributions to the plugin are welcome! Please read [CONTRIBUTING.md](CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests to us.

---

Remember to update the placeholders (like `your-username/your-repo-name` and `your-plugin-name`) with your actual GitHub username, repository name, and plugin name. This README serves as a starting point, and as your plugin grows in functionality and complexity, you can expand this document to include more detailed instructions, screenshots, and FAQs.
