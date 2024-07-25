interface TitleBarProps {
	newChat: (event: React.MouseEvent<HTMLElement>) => void;
}

const TitleBar: React.FC<TitleBarProps> = ({ newChat }) => {
	return (
		<div id="oq-view-title">
			<div id="oq-btn-new-chat" onClick={newChat} />
		</div>
	);
};

export default TitleBar;
