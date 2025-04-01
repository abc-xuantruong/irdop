import * as React from 'react';
const { useEffect, useRef } = React;

const TinyMceInput = ({ value, onUpdate, onKey }) => {
	const editorRef = useRef(null);

	// Helper function to check if content is empty
	const isEmptyContent = (content) => {
		// Check if content is just an empty paragraph or contains only whitespace
		if (!content || content === '<p></p>' || content === '<p> </p>') {
			return true;
		}
		// Remove HTML tags to check if there's only whitespace
		const textContent = content.replace(/<[^>]*>/g, '').trim();
		return textContent === '';
	};

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
			plugins: 'paste',
			paste_preprocess: function(plugin, args) {
				// Check if content contains table tags (likely from Excel)
				if (args.content.indexOf('<table') !== -1) {
					let content = args.content;
					
					// Replace table row endings with line breaks
					content = content.replace(/<\/tr>/gi, '<br>');
					
					// Strip table cell tags but keep content
					content = content.replace(/<t[dh][^>]*>/gi, '');
					content = content.replace(/<\/t[dh]>/gi, ' ');
					
					// Remove all other table tags
					content = content.replace(/<table[^>]*>/gi, '');
					content = content.replace(/<\/table>/gi, '');
					content = content.replace(/<tbody[^>]*>/gi, '');
					content = content.replace(/<\/tbody>/gi, '');
					content = content.replace(/<tr[^>]*>/gi, '');
					
					args.content = content;
				}
			},
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
					// Only call onUpdate if content is not empty
					if (!isEmptyContent(content)) {
						onUpdate(content);
					}
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
