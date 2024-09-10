interface TitleBarProps {
	newChat: (event: React.MouseEvent<HTMLElement>) => void;
}

const TitleBar: React.FC<TitleBarProps> = ({ newChat }) => {
	return (
		<div id="oq-view-title">
			{/* TODO: Convert to button */}
			<div id="oq-btn-new-conv" onClick={newChat} />
		</div>
	);
};

export default TitleBar;
