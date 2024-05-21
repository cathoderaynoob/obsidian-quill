import ReactMarkdown from "react-markdown";

interface MessageProps {
	message: string;
}

const Message: React.FC<MessageProps> = ({ message }) => {
	return (
		<div className="gpt-message">
			<ReactMarkdown>{message}</ReactMarkdown>
		</div>
	);
};

export default Message;
