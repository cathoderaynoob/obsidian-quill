interface TitleBarProps {
	clearMessages: () => void;
}

const TitleBar: React.FC<TitleBarProps> = ({ clearMessages }) => {
	return (
		<div id="oq-view-title">
			<div id="oq-btn-new-chat" onClick={clearMessages} />
		</div>
	);
};

export default TitleBar;
