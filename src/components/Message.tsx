import { Notice } from "obsidian";
import ReactMarkdown from "react-markdown";
// import { BetweenHorizontalEnd, Copy, FilePlus } from "lucide-react";
import { Copy, FilePlus } from "lucide-react";
import { Role } from "@/interfaces";
import { usePluginContext } from "@/components/PluginContext";

export interface MessageType {
	id: string;
	role: Role;
	content: string;
	model: string;
	selectedText?: string;
	error?: string;
	// status?: string;
}

interface MessageProps extends MessageType {
	dataIdx: string;
}

const Message: React.FC<MessageProps> = ({
	id,
	role,
	content: message,
	model,
	selectedText,
	error,
	dataIdx,
	// status,
}) => {
	const { settings, vault, vaultUtils } = usePluginContext();

	const saveMessage = async (event: React.MouseEvent<SVGSVGElement>) => {
		vaultUtils.saveMessageAs(message, vault, settings);
	};

	const copyMessageToClipboard = () => {
		try {
			navigator.clipboard.writeText(message);
			new Notice("Message copied to clipboard");
		} catch (e) {
			new Notice("Failed to copy message to clipboard");
		}
	};

	return (
		<>
			{message ? (
				<div className={`oq-message oq-message-${role}`} data-idx={dataIdx}>
					{role === "user" && <p className="oq-message-user-icon"></p>}
					<div
						className={`oq-message-content ${
							role === "assistant" ? "oq-message-streaming" : ""
						}`}
					>
						{error ? (
							<div className="oq-message-error">{error}</div>
						) : (
							<ReactMarkdown>{message}</ReactMarkdown>
						)}
						{selectedText && (
							<div className="oq-message-selectedtext">
								<label className="oq-message-selectedtext-content" htmlFor={id}>
									<ReactMarkdown>{selectedText}</ReactMarkdown>
								</label>
								<input
									type="checkbox"
									id={id}
									className="oq-expand-selectedtext"
								/>
							</div>
						)}
						{role === "assistant" && (
							<div className="oq-message-footer">
								<div className="oq-message-actions">
									<Copy
										size={18}
										strokeWidth={2}
										onClick={copyMessageToClipboard}
									/>
									<FilePlus size={18} strokeWidth={2} onClick={saveMessage} />
									{/* <BetweenHorizontalEnd size={18} strokeWidth={2} /> Not sure if this is really helpful */}
								</div>
								<div className="oq-message-model">{model}</div>
							</div>
						)}
					</div>
				</div>
			) : null}
		</>
	);
};

export default Message;
