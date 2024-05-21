import React, { useEffect, useState } from "react";
import Message from "@/Message";
import emitter from "@/customEmitter";
import { usePluginContext } from "@/PluginContext";

const Messages: React.FC = () => {
	const { apiService, settings } = usePluginContext();
	const [message, setMessage] = useState("");

	useEffect(() => {
		const handleUpdateResponse = (content: string) => {
			setMessage((prev) => prev + content);
		};

		emitter.on("updateResponse", handleUpdateResponse);

		return () => {
			emitter.off("updateResponse", handleUpdateResponse);
		};
	}, [apiService, settings]);

	return (
		<div className="gpt-messages">
			<Message message={message} />
		</div>
	);
};

export default Messages;
