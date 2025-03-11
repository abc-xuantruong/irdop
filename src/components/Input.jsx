import * as React from 'react';
const { useEffect, useRef } = React;

const TinyMceInput = ({ value, onUpdate, onKey }) => {
	const editorRef = useRef(null);

	useEffect(() => {
		const script = document.createElement('script');
		script.src = '/tinymce/tinymce.min.js';
		script.onload = () => initTinyMCE();
		document.body.appendChild(script);

		return () => {
			if (window.tinymce && editorRef.current) {
				window.tinymce.remove(editorRef.current);
			}
		};
	}, []);

	const initTinyMCE = () => {
		window.tinymce.init({
			target: editorRef.current,
			inline: true,
			menubar: false,
			toolbar: 'undo redo | superscript subscript',
			// content_style: 'body { font-family:Inter, Helvetica; font-size:10.5pt}',
			setup: (editor) => {
				editor.on('init', () => {
					editor.setContent(value);
					editor.focus();

					// Add z-index to editor container
					const editorContainer = editor.getContainer();
					if (editorContainer) {
						editorContainer.style.zIndex = '100';
					}
				});

				editor.on('blur', () => {
					const content = editor.getContent();
					onUpdate(content);
				});

				// Lắng nghe sự kiện keydown để cập nhật khi nhấn Enter hoặc X
				editor.on('keydown', (e) => {
					if (e.key === 'Enter') {
						e.preventDefault(); // Ngăn chặn hành vi mặc định
						const content = editor.getContent();
						onKey(e, content);
						// onUpdate(content);
					} else if (e.key.toLowerCase() === 'x') {
						e.preventDefault();
						editor.execCommand('mceInsertContent', false, '×');
					}
				});
			},
			license_key: 'gpl',
		});
	};

	return (
		<div ref={editorRef} className="border rounded h-full w-full cursor-pointer flex items-center justify-center p-1">
			<div dangerouslySetInnerHTML={{ __html: value }} />
		</div>
	);
};

export default TinyMceInput;
