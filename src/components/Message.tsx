import { Notice } from "obsidian";
import ReactMarkdown from "react-markdown";
// import { BetweenHorizontalEnd, Copy, FilePlus } from "lucide-react";
import { Copy, FilePlus } from "lucide-react";
import { Role } from "@/interfaces";
import { usePluginContext } from "@/components/PluginContext";

export interface MessageType {
	conversationId: string | null;
	convIdx: number;
	id: string;
	role: Role;
	content: string;
	model: string;
	selectedText?: string;
	error?: string;
	// status?: string;
}

interface MessageProps extends MessageType {
	handleOnCollapse: (index: number) => void;
}

const Message: React.FC<MessageProps> = ({
	conversationId,
	convIdx,
	id,
	role,
	content: message,
	model,
	selectedText,
	error,
	handleOnCollapse,
	// status,
}) => {
	const { settings, vaultUtils } = usePluginContext();

	const saveMessage = async (event: React.MouseEvent<SVGSVGElement>) => {
		vaultUtils.saveMessageAs(message, settings);
	};

	const copyMessageToClipboard = () => {
		try {
			navigator.clipboard.writeText(message);
			new Notice("Message copied to clipboard");
		} catch (e) {
			new Notice("Failed to copy message to clipboard");
		}
	};

	const handleCollapseSelectedText = (
		event: React.ChangeEvent<HTMLInputElement>
	) => {
		if (!event.target.checked) handleOnCollapse(convIdx);
	};

	return (
		<>
			{message ? (
				<div className={`oq-message oq-message-${role}`} conv-idx={convIdx}>
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
									className="oq-message-selectedtext-checkbox"
									onChange={handleCollapseSelectedText}
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
