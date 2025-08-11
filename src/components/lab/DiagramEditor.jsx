import React, { useState, useCallback, useRef, useEffect } from 'react';

// Danh sách ký hiệu toán học với enhanced fractions
const mathSymbols = [
	{ label: 'Professional Fraction', latex: '\\frac{a}{b}' },
	{ label: 'Simple Fraction', latex: '\\frac{1}{2}' },
	{ label: 'Complex Fraction', latex: '\\frac{x+1}{y-2}' },
	{ label: 'Square Root', latex: '\\sqrt{x}' },
	{ label: 'Exponent', latex: 'x^2' },
	{ label: 'Sum', latex: '\\sum_{i=0}^{n}' },
	{ label: 'Integral', latex: '\\int_{a}^{b}' },
	{ label: 'Greek Alpha', latex: '\\alpha' },
	{ label: 'Greek Beta', latex: '\\beta' },
	{ label: 'Pi', latex: '\\pi' },
	{ label: 'Infinity', latex: '\\infty' },
	{ label: 'Plus/Minus', latex: '\\pm' },
	{ label: 'Not Equal', latex: '\\neq' },
];

const DiagramEditor = ({ showMathPopup, closeMathPopup, showDiagramPopup, closeDiagramPopup, editorRef }) => {
	const latexInputRef = useRef(null);
	const [diagramNodes, setDiagramNodes] = useState([]);
	const [diagramEdges, setDiagramEdges] = useState([]);
	const [nodeIdCounter, setNodeIdCounter] = useState(1);

	// Diagram modes and selection states
	const [diagramMode, setDiagramMode] = useState('node'); // 'node' or 'relation'
	const [selectedNode, setSelectedNode] = useState(null);
	const [selectedEdge, setSelectedEdge] = useState(null);
	const [editingNode, setEditingNode] = useState(null);
	const [creatingRelation, setCreatingRelation] = useState(null); // {sourceId: string}

	// State cho textarea LaTeX
	const [latexValue, setLatexValue] = useState('x^2 + y^2 = r^2');

	// Kiểm tra thư viện math có sẵn (enhanced)
	const checkMathLibraries = useCallback(() => {
		const libraries = [];
		const libraryStatus = {};

		// Check MathLive
		if (typeof window.MathLive?.convertLatexToMarkup === 'function') {
			libraries.push('MathLive');
			libraryStatus.MathLive = '✅ Available';
		} else {
			libraryStatus.MathLive = '❌ Not loaded';
		}

		// Check global convertLatexToMarkup
		if (typeof window.convertLatexToMarkup === 'function') {
			libraries.push('convertLatexToMarkup');
			libraryStatus.convertLatexToMarkup = '✅ Available';
		} else {
			libraryStatus.convertLatexToMarkup = '❌ Not loaded';
		}

		// Check KaTeX
		if (typeof window.katex?.renderToString === 'function') {
			libraries.push('KaTeX');
			libraryStatus.KaTeX = '✅ Available';
		} else {
			libraryStatus.KaTeX = '❌ Not loaded';
		}

		// Check MathJax
		if (window.MathJax && window.MathJax.tex2svg) {
			libraries.push('MathJax');
			libraryStatus.MathJax = '✅ Available';
		} else {
			libraryStatus.MathJax = '❌ Not loaded';
		}

		// Enhanced Unicode Fallback is always available
		libraryStatus.EnhancedUnicode = '✅ Always Available';

		return { libraries, libraryStatus };
	}, []);

	// Render basic math với Unicode symbols và enhanced fraction display (error-safe)
	const renderBasicMath = useCallback((latex) => {
		try {
			// Map các LaTeX symbols phổ biến sang Unicode
			const mathSymbolMap = {
				'\\alpha': 'α',
				'\\beta': 'β',
				'\\gamma': 'γ',
				'\\delta': 'δ',
				'\\pi': 'π',
				'\\sigma': 'σ',
				'\\lambda': 'λ',
				'\\mu': 'μ',
				'\\infty': '∞',
				'\\pm': '±',
				'\\mp': '∓',
				'\\neq': '≠',
				'\\leq': '≤',
				'\\geq': '≥',
				'\\approx': '≈',
				'\\equiv': '≡',
				'\\sum': '∑',
				'\\prod': '∏',
				'\\int': '∫',
				'\\partial': '∂',
				'\\nabla': '∇',
				'\\sqrt': '√',
				'\\cdot': '·',
				'\\times': '×',
				'\\div': '÷',
				'\\in': '∈',
				'\\subset': '⊂',
				'\\cup': '∪',
				'\\cap': '∩',
				'\\emptyset': '∅',
				'\\rightarrow': '→',
				'\\leftarrow': '←',
			};

			// Escape HTML để tránh XSS và lỗi JavaScript
			let result = String(latex || '').replace(/[&<>"']/g, (match) => {
				const escapeMap = {
					'&': '&amp;',
					'<': '&lt;',
					'>': '&gt;',
					'"': '&quot;',
					"'": '&#x27;',
				};
				return escapeMap[match];
			});

			// Thay thế các ký hiệu đơn giản
			Object.entries(mathSymbolMap).forEach(([latexSymbol, unicode]) => {
				result = result.replaceAll(latexSymbol, unicode);
			});

			// Enhanced fraction handling với HTML styling (safe)
			result = result.replace(/\\frac\{([^}]*)\}\{([^}]*)\}/g, (match, numerator, denominator) => {
				// Sanitize numerator and denominator
				const safeNumerator = String(numerator || '').replace(/[<>"'&]/g, '');
				const safeDenominator = String(denominator || '').replace(/[<>"'&]/g, '');

				return `<span style="display: inline-block; text-align: center; vertical-align: middle; margin: 0 4px; font-size: 0.9em;">
					<span style="display: block; border-bottom: 2px solid currentColor; padding-bottom: 2px; line-height: 1.2; font-size: 1.1em;">${safeNumerator}</span>
					<span style="display: block; padding-top: 2px; line-height: 1.2; font-size: 1.1em;">${safeDenominator}</span>
				</span>`;
			});

			// Safe superscripts
			result = result.replace(/\^2/g, '<sup style="font-size: 0.75em;">2</sup>');
			result = result.replace(/\^3/g, '<sup style="font-size: 0.75em;">3</sup>');
			result = result.replace(/\^(\d)/g, (match, digit) => {
				const safeDigit = String(digit || '').replace(/[^0-9]/g, '');
				return `<sup style="font-size: 0.75em;">${safeDigit}</sup>`;
			});

			// Safe subscripts
			result = result.replace(/_(\d)/g, (match, digit) => {
				const safeDigit = String(digit || '').replace(/[^0-9]/g, '');
				return `<sub style="font-size: 0.75em;">${safeDigit}</sub>`;
			});

			// Safe sqrt handling
			result = result.replace(/\\sqrt\{([^}]*)\}/g, (match, content) => {
				const safeContent = String(content || '').replace(/[<>"'&]/g, '');
				return `<span style="position: relative;">√<span style="text-decoration: overline; margin-left: 2px;">${safeContent}</span></span>`;
			});

			// Safe sum và integral với better spacing
			result = result.replace(/\\sum_\{([^}]*)\}\^\{([^}]*)\}/g, (match, lower, upper) => {
				const safeLower = String(lower || '').replace(/[<>"'&]/g, '');
				const safeUpper = String(upper || '').replace(/[<>"'&]/g, '');
				return `<span style="display: inline-block; text-align: center; vertical-align: middle; margin: 0 4px;">
					<span style="display: block; font-size: 0.7em; line-height: 1;">${safeUpper}</span>
					<span style="display: block; font-size: 1.4em;">∑</span>
					<span style="display: block; font-size: 0.7em; line-height: 1;">${safeLower}</span>
				</span>`;
			});

			result = result.replace(/\\int_\{([^}]*)\}\^\{([^}]*)\}/g, (match, lower, upper) => {
				const safeLower = String(lower || '').replace(/[<>"'&]/g, '');
				const safeUpper = String(upper || '').replace(/[<>"'&]/g, '');
				return `<span style="display: inline-block; text-align: center; vertical-align: middle; margin: 0 4px;">
					<span style="display: block; font-size: 0.7em; line-height: 1;">${safeUpper}</span>
					<span style="display: block; font-size: 1.4em;">∫</span>
					<span style="display: block; font-size: 0.7em; line-height: 1;">${safeLower}</span>
				</span>`;
			});

			return result;
		} catch (error) {
			console.error('Error in renderBasicMath:', error);
			// Return safe fallback
			return String(latex || '').replace(/[&<>"']/g, (match) => {
				const escapeMap = {
					'&': '&amp;',
					'<': '&lt;',
					'>': '&gt;',
					'"': '&quot;',
					"'": '&#x27;',
				};
				return escapeMap[match];
			});
		}
	}, []);

	// Cập nhật preview với giá trị cụ thể (để hiển thị ngay khi click nút)
	const updateMathPreviewWithValue = useCallback(
		(value) => {
			try {
				const previewElement = document.getElementById('mathPreview');
				if (previewElement && value) {
					let html = null;
					let renderMethod = '';
					let useLibraryRendering = false;

					try {
						// Thử các thư viện math có sẵn
						if (typeof window.MathLive?.convertLatexToMarkup === 'function') {
							html = window.MathLive.convertLatexToMarkup(value, {
								mathstyle: 'displaystyle',
								format: 'html',
								letterShapeStyle: 'tex',
							});
							renderMethod = 'MathLive';
							useLibraryRendering = true;
						} else if (typeof window.convertLatexToMarkup === 'function') {
							html = window.convertLatexToMarkup(value, {
								mathstyle: 'displaystyle',
								format: 'html',
							});
							renderMethod = 'convertLatexToMarkup';
							useLibraryRendering = true;
						} else if (typeof window.katex?.renderToString === 'function') {
							html = window.katex.renderToString(value, {
								displayMode: true,
								throwOnError: false,
								strict: false,
							});
							renderMethod = 'KaTeX';
							useLibraryRendering = true;
						} else if (window.MathJax && window.MathJax.tex2svg) {
							const svg = window.MathJax.tex2svg(value, {
								display: true,
								em: 16,
								ex: 8,
								containerWidth: 500,
							});
							html = svg.outerHTML;
							renderMethod = 'MathJax';
							useLibraryRendering = true;
						}
					} catch (libraryError) {
						console.warn('Math library error:', libraryError);
						html = null;
						useLibraryRendering = false;
					}

					if (html && useLibraryRendering) {
						// Hiển thị với thư viện math chuyên nghiệp
						previewElement.innerHTML = `
						<div style="
							font-family: 'KaTeX_Main', 'Computer Modern', 'Times New Roman', serif;
							font-size: 28px;
							color: #2d3748;
							line-height: 1.6;
							text-align: center;
							padding: 24px;
							background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
							border-radius: 16px;
							box-shadow: inset 0 2px 6px rgba(0,0,0,0.08), 0 4px 12px rgba(0,0,0,0.15);
							border: 2px solid #cbd5e0;
							min-height: 80px;
							display: flex;
							align-items: center;
							justify-content: center;
							position: relative;
						">
							<div style="transform: scale(1.1); transform-origin: center;">${html}</div>
							<div style="
								position: absolute;
								top: 8px;
								right: 12px;
								font-size: 10px;
								color: #4a5568;
								background: rgba(255,255,255,0.9);
								padding: 2px 6px;
								border-radius: 4px;
								font-weight: 500;
								box-shadow: 0 1px 3px rgba(0,0,0,0.1);
							">✨ ${renderMethod}</div>
						</div>
					`;
					} else {
						// Enhanced fallback với HTML đơn giản
						const basicRendered = renderBasicMath(value);
						previewElement.innerHTML = `
						<div style="
							color: #2d3748;
							background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
							border: 2px solid #22c55e;
							border-radius: 12px;
							padding: 20px;
							text-align: center;
							font-size: 22px;
							font-family: 'Computer Modern', 'Times New Roman', serif;
							line-height: 1.8;
							box-shadow: 0 4px 12px rgba(34, 197, 94, 0.2);
						">
							<div style="
								background: #ffffff; 
								color: #1a202c; 
								padding: 20px 24px;
								border-radius: 8px;
								font-size: 28px;
								border: 2px solid #22c55e;
								min-height: 80px;
								display: flex;
								align-items: center;
								justify-content: center;
								box-shadow: inset 0 2px 4px rgba(34, 197, 94, 0.1);
								letter-spacing: 0.5px;
								font-weight: 500;
								position: relative;
							">
								<div style="transform: scale(1.1); transform-origin: center;">${basicRendered}</div>
								<div style="
									position: absolute;
									top: 8px;
									right: 12px;
									font-size: 10px;
									color: #166534;
									background: rgba(220, 252, 231, 0.95);
									padding: 2px 6px;
									border-radius: 4px;
									font-weight: 500;
									border: 1px solid #22c55e;
								">✅ Enhanced</div>
							</div>
						</div>
					`;
					}
				} else if (previewElement) {
					previewElement.innerHTML = `
					<div style="
						color: #6b7280;
						font-style: italic;
						text-align: center;
						padding: 24px;
						background: linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%);
						border: 2px dashed #d1d5db;
						border-radius: 12px;
						font-size: 18px;
						min-height: 80px;
						display: flex;
						align-items: center;
						justify-content: center;
						flex-direction: column;
					">
						<div style="font-size: 32px; margin-bottom: 8px;">🧮</div>
						<div>Công thức toán học sẽ hiển thị tại đây</div>
					</div>
				`;
				}
			} catch (error) {
				console.error('Error in updateMathPreviewWithValue:', error);
				const previewElement = document.getElementById('mathPreview');
				if (previewElement) {
					previewElement.innerHTML = `
					<div style="
						color: #dc2626;
						background: #fef2f2;
						border: 2px solid #fca5a5;
						border-radius: 8px;
						padding: 16px;
						text-align: center;
						font-size: 14px;
					">
						⚠️ Lỗi hiển thị preview
					</div>
				`;
				}
			}
		},
		[renderBasicMath],
	);

	// MathLive: Xử lý click để chèn ký hiệu vào textarea và update preview ngay lập tức
	const handleMathSymbolClick = useCallback(
		(latex) => {
			const textarea = latexInputRef.current;
			if (textarea) {
				const start = textarea.selectionStart;
				const end = textarea.selectionEnd;
				const currentValue = latexValue;

				// Chèn latex vào vị trí cursor
				const newValue = currentValue.substring(0, start) + latex + currentValue.substring(end);
				setLatexValue(newValue);

				// Cập nhật preview ngay lập tức với giá trị mới
				setTimeout(() => {
					textarea.focus();
					const newCursorPos = start + latex.length;
					textarea.setSelectionRange(newCursorPos, newCursorPos);
					// Gọi updateMathPreviewWithValue với giá trị mới để hiển thị preview ngay
					updateMathPreviewWithValue(newValue);
				}, 10);
			}
		},
		[latexValue, updateMathPreviewWithValue],
	);

	// Preprocessing LaTeX input để cải thiện hiển thị (error-safe)
	const preprocessLatex = (input) => {
		try {
			if (!input || typeof input !== 'string') {
				return '';
			}

			let processed = input;

			// Tự động chuyển đổi a/b thành \frac{a}{b} (với pattern phức tạp hơn)
			// Pattern 1: Số đơn giản / số đơn giản (ví dụ: 1/2, 3/4)
			processed = processed.replace(/(\d+)\/(\d+)/g, '\\frac{$1}{$2}');

			// Pattern 2: Biến đơn giản / biến đơn giản (ví dụ: a/b, x/y) - chỉ single letter
			processed = processed.replace(/\b([a-zA-Z])\s*\/\s*([a-zA-Z])\b/g, '\\frac{$1}{$2}');

			// Pattern 3: Biểu thức trong ngoặc (ví dụ: (x+1)/(y-2))
			processed = processed.replace(/\(([^)]+)\)\s*\/\s*\(([^)]+)\)/g, '\\frac{$1}{$2}');

			// Pattern 4: Số / biểu thức hoặc biểu thức / số
			processed = processed.replace(/(\d+)\s*\/\s*\(([^)]+)\)/g, '\\frac{$1}{$2}');
			processed = processed.replace(/\(([^)]+)\)\s*\/\s*(\d+)/g, '\\frac{$1}{$2}');

			return processed;
		} catch (error) {
			console.error('Error in preprocessLatex:', error);
			return String(input || '');
		}
	};

	// Xử lý thay đổi trong textarea với preprocessing (error-safe)
	const handleLatexChange = (e) => {
		try {
			const rawValue = e?.target?.value || '';
			const processedValue = preprocessLatex(rawValue);
			setLatexValue(processedValue);
			updateMathPreview();
		} catch (error) {
			console.error('Error in handleLatexChange:', error);
			// Fallback to raw value without processing
			const rawValue = e?.target?.value || '';
			setLatexValue(rawValue);
			updateMathPreview();
		}
	};

	// Cập nhật preview công thức toán học với nhiều fallback và displaystyle enhanced (error-safe)
	const updateMathPreview = useCallback(() => {
		try {
			const previewElement = document.getElementById('mathPreview');
			if (previewElement && latexValue) {
				let html = null;
				let renderMethod = '';
				let useLibraryRendering = false;

				try {
					// 1. Thử MathLive.convertLatexToMarkup với displaystyle enhanced
					if (typeof window.MathLive?.convertLatexToMarkup === 'function') {
						html = window.MathLive.convertLatexToMarkup(latexValue, {
							mathstyle: 'displaystyle',
							format: 'html',
							letterShapeStyle: 'tex',
						});
						renderMethod = 'MathLive (Professional Display)';
						useLibraryRendering = true;
					}
					// 2. Thử convertLatexToMarkup global với displaystyle
					else if (typeof window.convertLatexToMarkup === 'function') {
						html = window.convertLatexToMarkup(latexValue, {
							mathstyle: 'displaystyle',
							format: 'html',
						});
						renderMethod = 'convertLatexToMarkup (Display)';
						useLibraryRendering = true;
					}
					// 3. Thử KaTeX nếu có với displayMode cho phân số professional
					else if (typeof window.katex?.renderToString === 'function') {
						html = window.katex.renderToString(latexValue, {
							displayMode: true,
							throwOnError: false,
							strict: false,
							macros: {
								'\\f': '#1f(#2)',
							},
						});
						renderMethod = 'KaTeX (Display Mode)';
						useLibraryRendering = true;
					}
					// 4. Thử MathJax nếu có với display settings
					else if (window.MathJax && window.MathJax.tex2svg) {
						const svg = window.MathJax.tex2svg(latexValue, {
							display: true,
							em: 16,
							ex: 8,
							containerWidth: 500,
						});
						html = svg.outerHTML;
						renderMethod = 'MathJax (Display)';
						useLibraryRendering = true;
					}
				} catch (libraryError) {
					console.warn('Math library error:', libraryError);
					html = null;
					useLibraryRendering = false;
				}

				if (html && useLibraryRendering) {
					// Hiển thị với thư viện math chuyên nghiệp
					previewElement.innerHTML = `
						<div class="math-preview-container" style="
							font-family: 'KaTeX_Main', 'Computer Modern', 'Times New Roman', serif;
							font-size: 28px;
							color: #2d3748;
							line-height: 1.6;
							text-align: center;
							padding: 24px;
							background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
							border-radius: 16px;
							box-shadow: inset 0 2px 6px rgba(0,0,0,0.08), 0 4px 12px rgba(0,0,0,0.15);
							border: 2px solid #cbd5e0;
							min-height: 80px;
							display: flex;
							align-items: center;
							justify-content: center;
							position: relative;
						">
							<div style="
								transform: scale(1.1);
								transform-origin: center;
							">${html}</div>
							<div style="
								position: absolute;
								top: 8px;
								right: 12px;
								font-size: 10px;
								color: #4a5568;
								background: rgba(255,255,255,0.9);
								padding: 2px 6px;
								border-radius: 4px;
								font-weight: 500;
								box-shadow: 0 1px 3px rgba(0,0,0,0.1);
							">✨ ${renderMethod}</div>
						</div>
						<div style="
							font-size: 11px;
							color: #718096;
							text-align: center;
							margin-top: 8px;
							font-style: italic;
						">Professional math rendering with enhanced displaystyle</div>
					`;
				} else {
					// Always use enhanced fallback - không throw error
					console.log('Using enhanced Unicode fallback for math rendering');
					const basicRendered = renderBasicMath(latexValue);
					const safeLatexValue = String(latexValue || '').replace(/[&<>"']/g, (match) => {
						const escapeMap = {
							'&': '&amp;',
							'<': '&lt;',
							'>': '&gt;',
							'"': '&quot;',
							"'": '&#x27;',
						};
						return escapeMap[match];
					});

					previewElement.innerHTML = `
						<div style="
							color: #2d3748;
							background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
							border: 2px solid #22c55e;
							border-radius: 12px;
							padding: 20px;
							text-align: center;
							font-size: 22px;
							font-family: 'Computer Modern', 'Times New Roman', serif;
							line-height: 1.8;
							box-shadow: 0 4px 12px rgba(34, 197, 94, 0.2);
						">
							<div style="margin-bottom: 16px; font-weight: 600; font-size: 14px; color: #166534;">
								🎯 Enhanced Math Preview (Unicode Professional):
							</div>
							<div style="
								background: #ffffff; 
								color: #1a202c; 
								padding: 20px 24px;
								border-radius: 8px;
								font-size: 28px;
								border: 2px solid #22c55e;
								margin-bottom: 16px;
								min-height: 80px;
								display: flex;
								align-items: center;
								justify-content: center;
								box-shadow: inset 0 2px 4px rgba(34, 197, 94, 0.1);
								letter-spacing: 0.5px;
								font-weight: 500;
								position: relative;
							">
								<div style="transform: scale(1.1); transform-origin: center;">${basicRendered}</div>
								<div style="
									position: absolute;
									top: 8px;
									right: 12px;
									font-size: 10px;
									color: #166534;
									background: rgba(220, 252, 231, 0.95);
									padding: 2px 6px;
									border-radius: 4px;
									font-weight: 500;
									border: 1px solid #22c55e;
								">✅ ENHANCED</div>
							</div>
							<details style="font-size: 12px; color: #059669; text-align: left; margin-top: 8px;">
								<summary style="cursor: pointer; font-weight: 600; margin-bottom: 8px; color: #166534;">� LaTeX Source & Enhancement Info</summary>
								<div style="
									background: #f0fdf4; 
									color: #166534; 
									padding: 12px 16px;
									border-radius: 6px;
									font-family: 'Consolas', 'Monaco', monospace;
									font-size: 13px;
									margin-bottom: 8px;
									white-space: pre-wrap;
									border: 1px solid #22c55e;
								">${safeLatexValue}</div>
								<div style="
									font-size: 11px;
									color: #166534;
									background: #ecfdf5;
									padding: 8px 12px;
									border-radius: 4px;
									border: 1px solid #bbf7d0;
									line-height: 1.4;
								">
									� <strong>Enhanced Features:</strong><br>
									✅ Professional fraction rendering with HTML<br>
									✅ Unicode mathematical symbols<br>
									✅ Auto-conversion: "a/b" → "\\frac{a}{b}"<br>
									✅ Styled superscripts and subscripts<br>
									✅ Enhanced sum and integral displays<br><br>
									💡 <em>Add KaTeX, MathJax, or MathLive for even better rendering!</em>
								</div>
							</details>
						</div>
					`;
				}
			} else if (previewElement) {
				previewElement.innerHTML = `
					<div style="
						color: #6b7280;
						font-style: italic;
						text-align: center;
						padding: 24px;
						background: linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%);
						border: 2px dashed #d1d5db;
						border-radius: 12px;
						font-size: 18px;
						min-height: 80px;
						display: flex;
						align-items: center;
						justify-content: center;
						flex-direction: column;
					">
						<div style="font-size: 32px; margin-bottom: 8px;">🧮</div>
						<div>Professional math formula will display here</div>
						<div style="font-size: 14px; margin-top: 4px; color: #9ca3af;">Enhanced rendering with or without math libraries</div>
					</div>
				`;
			}
		} catch (error) {
			console.error('Critical error in updateMathPreview:', error);
			const previewElement = document.getElementById('mathPreview');
			if (previewElement) {
				previewElement.innerHTML = `
					<div style="
						color: #dc2626;
						background: #fef2f2;
						border: 2px solid #fca5a5;
						border-radius: 8px;
						padding: 16px;
						text-align: center;
						font-size: 14px;
					">
						⚠️ Error rendering math preview. Using safe mode...<br>
						<div style="margin-top: 8px; font-size: 12px; color: #991b1b;">
							${String(latexValue || '').replace(/[&<>"']/g, '')}
						</div>
					</div>
				`;
			}
		}
	}, [latexValue, renderBasicMath]);

	// Chèn công thức vào TinyMCE với HTML đơn giản
	const insertMathFromField = () => {
		if (editorRef?.current) {
			try {
				if (!latexValue) {
					alert('Vui lòng nhập công thức trước khi chèn');
					return;
				}

				let html = null;

				// 1. Thử MathLive.convertLatexToMarkup với enhanced settings
				if (typeof window.MathLive?.convertLatexToMarkup === 'function') {
					html = window.MathLive.convertLatexToMarkup(latexValue, {
						mathstyle: 'displaystyle',
						format: 'html',
						letterShapeStyle: 'tex',
					});
				}
				// 2. Thử convertLatexToMarkup global với displaystyle
				else if (typeof window.convertLatexToMarkup === 'function') {
					html = window.convertLatexToMarkup(latexValue, {
						mathstyle: 'displaystyle',
						format: 'html',
					});
				}
				// 3. Thử KaTeX với displayMode cho professional display
				else if (typeof window.katex?.renderToString === 'function') {
					html = window.katex.renderToString(latexValue, {
						displayMode: true,
						throwOnError: false,
						strict: false,
					});
				}
				// 4. Thử MathJax với display settings
				else if (window.MathJax && window.MathJax.tex2svg) {
					const svg = window.MathJax.tex2svg(latexValue, {
						display: true,
						em: 16,
						ex: 8,
						containerWidth: 500,
					});
					html = svg.outerHTML;
				}

				if (html) {
					// Chèn chỉ HTML của công thức, không có container styling
					editorRef.current.insertContent(html);
					console.log('Math equation HTML inserted');
				} else {
					// Enhanced fallback với HTML đơn giản
					const basicRendered = renderBasicMath(latexValue);
					editorRef.current.insertContent(basicRendered);
					console.warn('Inserted enhanced Unicode math with HTML fractions');
				}
				closeMathPopup();
			} catch (error) {
				console.error('Error inserting math equation:', error);
				alert('Lỗi khi chèn công thức toán học');
			}
		}
	};

	// Diagram: Thêm node
	const addNode = (type) => {
		const newNode = {
			id: `${nodeIdCounter}`,
			type,
			data: { label: type === 'input' ? 'Start' : type === 'output' ? 'End' : `Node ${nodeIdCounter}` },
			position: { x: Math.random() * 300, y: Math.random() * 200 },
		};
		setDiagramNodes((nds) => [...nds, newNode]);
		setNodeIdCounter((prev) => prev + 1);
	};

	// Diagram: Xử lý click node
	const handleNodeClick = (e, nodeId) => {
		e.stopPropagation();

		if (diagramMode === 'node') {
			setSelectedNode(nodeId);
			setSelectedEdge(null);
		} else if (diagramMode === 'relation') {
			if (creatingRelation) {
				if (creatingRelation.sourceId === nodeId) {
					// Click vào chính node đầu -> hủy
					setCreatingRelation(null);
				} else {
					// Tạo relation mới
					const newEdge = {
						id: `e${creatingRelation.sourceId}-${nodeId}`,
						source: creatingRelation.sourceId,
						target: nodeId,
					};
					setDiagramEdges((eds) => [...eds, newEdge]);
					setCreatingRelation(null);
				}
			} else {
				// Bắt đầu tạo relation từ node này
				setCreatingRelation({ sourceId: nodeId });
			}
		}
	};

	// Diagram: Xử lý double click để edit node
	const handleNodeDoubleClick = (nodeId) => {
		if (diagramMode === 'node') {
			setEditingNode(nodeId);
		}
	};

	// Diagram: Update node label
	const updateNodeLabel = (nodeId, newLabel) => {
		setDiagramNodes((nodes) =>
			nodes.map((node) => (node.id === nodeId ? { ...node, data: { ...node.data, label: newLabel } } : node)),
		);
		setEditingNode(null);
	};

	// Diagram: Xử lý kéo node với throttle để tránh delay
	const handleNodeDragStart = (e, nodeId) => {
		if (diagramMode !== 'node') return;
		e.dataTransfer.effectAllowed = 'move';
	};

	const handleNodeDrag = (e, nodeId) => {
		if (diagramMode !== 'node') return;

		// Throttle drag events để tránh delay
		if (e.clientX && e.clientY && e.clientX !== 0 && e.clientY !== 0) {
			const canvas = e.currentTarget.closest('.diagram-canvas');
			if (canvas) {
				const rect = canvas.getBoundingClientRect();
				const newPosition = {
					x: Math.max(0, Math.min(e.clientX - rect.left - 48, canvas.offsetWidth - 96)),
					y: Math.max(0, Math.min(e.clientY - rect.top - 24, canvas.offsetHeight - 48)),
				};

				// Sử dụng requestAnimationFrame để smooth update
				requestAnimationFrame(() => {
					setDiagramNodes((nodes) => nodes.map((n) => (n.id === nodeId ? { ...n, position: newPosition } : n)));
				});
			}
		}
	};

	// Diagram: Xử lý click edge
	const handleEdgeClick = (e, edgeId) => {
		e.stopPropagation();
		setSelectedEdge(edgeId);
		setSelectedNode(null);
	};

	// Diagram: Xử lý click canvas
	const handleCanvasClick = () => {
		setSelectedNode(null);
		setSelectedEdge(null);
		setCreatingRelation(null);
	};

	// Diagram: Xử lý keyboard events
	const handleKeyDown = useCallback(
		(e) => {
			if (e.key === 'Delete' && selectedEdge) {
				setDiagramEdges((edges) => edges.filter((edge) => edge.id !== selectedEdge));
				setSelectedEdge(null);
			}
			if (e.key === 'Escape') {
				setCreatingRelation(null);
				setSelectedNode(null);
				setSelectedEdge(null);
			}
		},
		[selectedEdge],
	);

	// Diagram: Xuất sơ đồ vào TinyMCE với rendering HTML trước
	const exportDiagram = () => {
		if (editorRef?.current) {
			try {
				// Tạo SVG string
				const svgContent = `
					<svg width="500" height="400" xmlns="http://www.w3.org/2000/svg">
						<defs>
							<marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
								<polygon points="0 0, 10 3.5, 0 7" fill="#666" />
							</marker>
						</defs>
						${diagramEdges
							.map((edge) => {
								const sourceNode = diagramNodes.find((n) => n.id === edge.source);
								const targetNode = diagramNodes.find((n) => n.id === edge.target);
								if (!sourceNode || !targetNode) return '';

								// Tính toán điểm bắt đầu và kết thúc ở viền node
								const sourceCenter = { x: sourceNode.position.x + 48, y: sourceNode.position.y + 24 };
								const targetCenter = { x: targetNode.position.x + 48, y: targetNode.position.y + 24 };

								const dx = targetCenter.x - sourceCenter.x;
								const dy = targetCenter.y - sourceCenter.y;
								const distance = Math.sqrt(dx * dx + dy * dy);

								const unitX = dx / distance;
								const unitY = dy / distance;

								const startX = sourceCenter.x + unitX * 48;
								const startY = sourceCenter.y + unitY * 24;
								const endX = targetCenter.x - unitX * 48;
								const endY = targetCenter.y - unitY * 24;

								return `
									<line
										x1="${startX}"
										y1="${startY}"
										x2="${endX}"
										y2="${endY}"
										stroke="#666"
										stroke-width="2"
										marker-end="url(#arrowhead)"
									/>
								`;
							})
							.join('')}
						${diagramNodes
							.map(
								(node) => `
									<rect 
										x="${node.position.x}" 
										y="${node.position.y}" 
										width="96" 
										height="48" 
										fill="${node.type === 'input' ? '#ecfdf5' : node.type === 'output' ? '#fef2f2' : '#dbeafe'}" 
										stroke="${node.type === 'input' ? '#4ade80' : node.type === 'output' ? '#f87171' : '#60a5fa'}" 
										stroke-width="2" 
										rx="4"
									/>
									<text 
										x="${node.position.x + 48}" 
										y="${node.position.y + 28}" 
										text-anchor="middle" 
										fill="black" 
										font-size="12"
										font-family="Arial, sans-serif"
									>
										${node.data.label}
									</text>
								`,
							)
							.join('')}
					</svg>
				`;

				// Convert SVG thành base64 để chèn như image
				const svgBlob = new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8' });
				const url = URL.createObjectURL(svgBlob);

				// Tạo image element để render
				const img = new Image();
				img.onload = function () {
					// Tạo canvas để convert thành base64
					const canvas = document.createElement('canvas');
					const ctx = canvas.getContext('2d');
					canvas.width = 500;
					canvas.height = 400;

					ctx.fillStyle = 'white';
					ctx.fillRect(0, 0, canvas.width, canvas.height);
					ctx.drawImage(img, 0, 0);

					// Convert thành base64
					const base64 = canvas.toDataURL('image/png');

					// Chèn vào editor
					editorRef.current.insertContent(
						`<img src="${base64}" alt="Diagram" style="max-width: 100%; height: auto; border: 1px solid #ccc;" />`,
					);

					// Cleanup
					URL.revokeObjectURL(url);
					closeDiagramPopup();
				};

				img.onerror = function () {
					console.warn('Could not render diagram as image, inserting SVG directly');
					// Fallback: chèn SVG trực tiếp
					editorRef.current.insertContent(svgContent);
					URL.revokeObjectURL(url);
					closeDiagramPopup();
				};

				img.src = url;
			} catch (error) {
				console.error('Error exporting diagram:', error);
				// Fallback: chèn SVG string trực tiếp
				const svgContent = `
					<svg width="500" height="400" xmlns="http://www.w3.org/2000/svg" style="border: 1px solid #ccc;">
						<defs>
							<marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
								<polygon points="0 0, 10 3.5, 0 7" fill="#666" />
							</marker>
						</defs>
						${diagramEdges
							.map((edge) => {
								const sourceNode = diagramNodes.find((n) => n.id === edge.source);
								const targetNode = diagramNodes.find((n) => n.id === edge.target);
								if (!sourceNode || !targetNode) return '';

								const sourceCenter = { x: sourceNode.position.x + 48, y: sourceNode.position.y + 24 };
								const targetCenter = { x: targetNode.position.x + 48, y: targetNode.position.y + 24 };
								const dx = targetCenter.x - sourceCenter.x;
								const dy = targetCenter.y - sourceCenter.y;
								const distance = Math.sqrt(dx * dx + dy * dy);
								const unitX = dx / distance;
								const unitY = dy / distance;
								const startX = sourceCenter.x + unitX * 48;
								const startY = sourceCenter.y + unitY * 24;
								const endX = targetCenter.x - unitX * 48;
								const endY = targetCenter.y - unitY * 24;

								return `<line x1="${startX}" y1="${startY}" x2="${endX}" y2="${endY}" stroke="#666" stroke-width="2" marker-end="url(#arrowhead)" />`;
							})
							.join('')}
						${diagramNodes
							.map((node) => {
								return `<rect x="${node.position.x}" y="${node.position.y}" width="96" height="48" fill="${
									node.type === 'input' ? '#ecfdf5' : node.type === 'output' ? '#fef2f2' : '#dbeafe'
								}" stroke="${
									node.type === 'input' ? '#4ade80' : node.type === 'output' ? '#f87171' : '#60a5fa'
								}" stroke-width="2" rx="4" /><text x="${node.position.x + 48}" y="${
									node.position.y + 28
								}" text-anchor="middle" fill="black" font-size="12" font-family="Arial, sans-serif">${
									node.data.label
								}</text>`;
							})
							.join('')}
					</svg>
				`;
				editorRef.current.insertContent(svgContent);
				closeDiagramPopup();
			}
		}
	};

	// useEffect được tối ưu theo logic mới
	useEffect(() => {
		if (showMathPopup) {
			updateMathPreview();
		}
		if (showDiagramPopup) {
			document.addEventListener('keydown', handleKeyDown);
			return () => document.removeEventListener('keydown', handleKeyDown);
		}
	}, [showMathPopup, showDiagramPopup, handleKeyDown, updateMathPreview]);

	return (
		<>
			{/* Math Popup Modal */}
			{showMathPopup && (
				<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
					<div className="bg-white rounded-lg shadow-xl w-5/6 max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
						<div className="flex justify-between items-center px-6 py-4 border-b border-gray-200 bg-gray-50">
							<h3 className="text-lg font-semibold text-gray-800">Chèn công thức toán học</h3>
							<button
								onClick={closeMathPopup}
								className="text-gray-400 hover:text-gray-600 transition-colors text-xl"
								title="Đóng"
							>
								✕
							</button>
						</div>
						<div className="px-6 py-4 flex-1 overflow-y-auto">
							{/* Math Symbols Toolbar */}
							<div className="mb-4">
								<div className="flex justify-between items-center mb-2">
									<h4 className="text-sm font-semibold text-gray-700">Click vào các ký hiệu toán học để chèn:</h4>
								</div>
								<div className="flex flex-wrap gap-1 p-3 bg-gray-50 rounded-lg max-h-24 overflow-y-auto">
									{mathSymbols.map((symbol, index) => (
										<div
											key={index}
											className="cursor-pointer inline-block px-3 py-2 bg-white border border-gray-300 rounded hover:bg-blue-50 hover:border-blue-300 transition-all text-sm font-medium select-none shadow-sm active:scale-95"
											onClick={() => handleMathSymbolClick(symbol.latex)}
											title={`LaTeX: ${symbol.latex} - Click để chèn`}
										>
											{symbol.label}
										</div>
									))}
								</div>
								<div className="text-xs text-gray-600 mt-1">💡 Click vào ký hiệu để chèn LaTeX vào textarea</div>
							</div>

							{/* Math Formula Editor - Simplified Interface */}
							<div className="mb-4">
								<label className="block text-sm font-medium text-gray-700 mb-2">Soạn thảo công thức LaTeX:</label>
								<div className="border-2 border-gray-300 rounded-lg p-3 bg-white">
									<textarea
										ref={latexInputRef}
										value={latexValue}
										onChange={handleLatexChange}
										placeholder="Nhập LaTeX (a/b sẽ auto-convert thành \\frac{a}{b}) ví dụ: x^2 + 1/2 = r^2"
										rows={4}
										style={{
											width: '100%',
											fontSize: '14px',
											fontFamily: 'Consolas, Monaco, "Courier New", monospace',
											border: '1px solid #dee2e6',
											borderRadius: '6px',
											padding: '12px',
											resize: 'vertical',
											outline: 'none',
											background: 'white',
										}}
									/>
									<div className="text-xs text-blue-600 mt-2 flex items-center gap-2">
										<span>💡 Auto-convert: professional fractions</span>
										<button
											onClick={() => {
												setLatexValue('');
												updateMathPreview();
											}}
											className="text-xs text-red-500 hover:text-red-700 underline"
										>
											Xóa hết
										</button>
									</div>
								</div>
							</div>

							{/* Preview */}
							<div className="mb-4">
								<label className="block text-sm font-medium text-gray-700 mb-2">Xem trước HTML với CSS:</label>
								<div className="p-2 border-2 border-gray-200 rounded-md min-h-[120px] bg-gray-50">
									<div id="mathPreview" className="w-full" />
								</div>
							</div>
						</div>

						{/* Fixed Action Buttons */}
						<div className="flex gap-2 justify-end px-6 py-4 border-t border-gray-200 bg-gray-50">
							<button
								onClick={() => {
									setLatexValue('');
									updateMathPreview();
								}}
								className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
							>
								Xóa
							</button>
							<button
								onClick={closeMathPopup}
								className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
							>
								Hủy
							</button>
							<button
								onClick={insertMathFromField}
								className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-blue-600 rounded-md hover:bg-blue-700 transition-colors"
							>
								Chèn công thức
							</button>
						</div>
					</div>
				</div>
			)}

			{/* Diagram Popup Modal */}
			{showDiagramPopup && (
				<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
					<div className="bg-white rounded-lg shadow-xl w-5/6 max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
						<div className="flex justify-between items-center px-6 py-4 border-b border-gray-200 bg-gray-50">
							<h3 className="text-lg font-semibold text-gray-800">Tạo sơ đồ</h3>
							<button
								onClick={closeDiagramPopup}
								className="text-gray-400 hover:text-gray-600 transition-colors text-xl"
								title="Đóng"
							>
								✕
							</button>
						</div>
						<div className="px-6 py-4 flex-1 overflow-hidden flex flex-col">
							{/* Mode Selection */}
							<div className="flex gap-2 mb-4">
								<button
									onClick={() => {
										setDiagramMode('node');
										setCreatingRelation(null);
									}}
									className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
										diagramMode === 'node'
											? 'bg-blue-600 text-white border-blue-600'
											: 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
									}`}
								>
									🔷 Node Mode
								</button>
								<button
									onClick={() => {
										setDiagramMode('relation');
										setSelectedNode(null);
									}}
									className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
										diagramMode === 'relation'
											? 'bg-green-600 text-white border-green-600'
											: 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
									}`}
								>
									🔗 Relation Mode
								</button>
								{creatingRelation && (
									<div className="flex items-center text-sm text-orange-600 ml-4">
										🎯 Đang tạo mũi tên từ Node {creatingRelation.sourceId} - click node đích hoặc ESC để hủy
									</div>
								)}
							</div>

							{/* Toolbar */}
							<div className="flex gap-2 mb-4 p-3 bg-gray-100 rounded-md">
								<button
									onClick={() => addNode('default')}
									className="px-3 py-2 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors font-medium"
								>
									+ Node
								</button>
								<button
									onClick={() => addNode('input')}
									className="px-3 py-2 text-sm bg-green-500 text-white rounded hover:bg-green-600 transition-colors font-medium"
								>
									+ Start Node
								</button>
								<button
									onClick={() => addNode('output')}
									className="px-3 py-2 text-sm bg-red-500 text-white rounded hover:bg-red-600 transition-colors font-medium"
								>
									+ End Node
								</button>
								<button
									onClick={() => {
										setDiagramNodes([]);
										setDiagramEdges([]);
										setNodeIdCounter(1);
										setSelectedNode(null);
										setSelectedEdge(null);
										setCreatingRelation(null);
									}}
									className="px-3 py-2 text-sm bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors font-medium ml-auto"
								>
									Xóa tất cả
								</button>
							</div>

							{/* Canvas */}
							<div
								className="flex-1 border-2 border-gray-300 rounded-lg overflow-hidden relative bg-white diagram-canvas"
								onClick={handleCanvasClick}
								style={{ minHeight: '400px' }}
							>
								<div className="absolute top-2 right-2 text-xs text-gray-500 bg-white px-2 py-1 rounded border z-10">
									{diagramMode === 'node'
										? 'Node Mode: Kéo để di chuyển • Double-click để edit'
										: 'Relation Mode: Click node đầu → node cuối để tạo mũi tên • Click relation + Delete để xóa'}
								</div>

								<svg width="100%" height="100%" className="absolute inset-0">
									<defs>
										<marker
											id="arrowhead"
											markerWidth="10"
											markerHeight="7"
											refX="9"
											refY="3.5"
											orient="auto"
											markerUnits="strokeWidth"
										>
											<polygon points="0 0, 10 3.5, 0 7" fill="#666" />
										</marker>
									</defs>

									{/* Edges */}
									{diagramEdges.map((edge) => {
										const sourceNode = diagramNodes.find((n) => n.id === edge.source);
										const targetNode = diagramNodes.find((n) => n.id === edge.target);
										if (!sourceNode || !targetNode) return null;

										// Tính toán điểm bắt đầu và kết thúc ở viền node
										const sourceCenter = { x: sourceNode.position.x + 48, y: sourceNode.position.y + 24 };
										const targetCenter = { x: targetNode.position.x + 48, y: targetNode.position.y + 24 };

										// Tính vector từ source đến target
										const dx = targetCenter.x - sourceCenter.x;
										const dy = targetCenter.y - sourceCenter.y;
										const distance = Math.sqrt(dx * dx + dy * dy);

										// Normalize vector
										const unitX = dx / distance;
										const unitY = dy / distance;

										// Điểm bắt đầu ở viền source node (48px là bán kính)
										const startX = sourceCenter.x + unitX * 48;
										const startY = sourceCenter.y + unitY * 24;

										// Điểm kết thúc ở viền target node (trừ đi độ dài mũi tên)
										const endX = targetCenter.x - unitX * 48;
										const endY = targetCenter.y - unitY * 24;

										return (
											<line
												key={edge.id}
												x1={startX}
												y1={startY}
												x2={endX}
												y2={endY}
												stroke={selectedEdge === edge.id ? '#ff6b6b' : '#666'}
												strokeWidth={selectedEdge === edge.id ? '3' : '2'}
												markerEnd="url(#arrowhead)"
												className="cursor-pointer transition-all hover:stroke-blue-500"
												onClick={(e) => handleEdgeClick(e, edge.id)}
											/>
										);
									})}
								</svg>

								{/* Nodes */}
								{diagramNodes.map((node) => (
									<div
										key={node.id}
										className={`absolute select-none transition-all ${
											diagramMode === 'node' ? 'cursor-move' : 'cursor-pointer'
										} ${selectedNode === node.id ? 'ring-2 ring-blue-500 ring-opacity-50' : ''}`}
										style={{
											left: node.position.x,
											top: node.position.y,
											width: '96px',
											height: '48px',
											zIndex: selectedNode === node.id ? 10 : 1,
										}}
										draggable={diagramMode === 'node'}
										onClick={(e) => handleNodeClick(e, node.id)}
										onDoubleClick={() => handleNodeDoubleClick(node.id)}
										onDragStart={(e) => handleNodeDragStart(e, node.id)}
										onDrag={(e) => handleNodeDrag(e, node.id)}
									>
										<div
											className={`w-full h-full border-2 rounded flex items-center justify-center text-sm font-medium transition-all hover:scale-105 ${
												node.type === 'input'
													? 'bg-green-100 border-green-400 text-green-700'
													: node.type === 'output'
													? 'bg-red-100 border-red-400 text-red-700'
													: 'bg-blue-100 border-blue-400 text-blue-700'
											} ${selectedNode === node.id ? 'ring-2 ring-blue-500' : ''}`}
										>
											{editingNode === node.id ? (
												<input
													type="text"
													defaultValue={node.data.label}
													className="w-full text-center text-xs bg-transparent border-none outline-none"
													onBlur={(e) => updateNodeLabel(node.id, e.target.value)}
													onKeyDown={(e) => {
														if (e.key === 'Enter') {
															updateNodeLabel(node.id, e.target.value);
														}
													}}
													autoFocus
													onFocus={(e) => e.target.select()}
												/>
											) : (
												node.data.label
											)}
										</div>
									</div>
								))}

								{/* Instructions */}
								{diagramNodes.length === 0 && (
									<div className="absolute inset-0 flex items-center justify-center text-gray-500">
										<div className="text-center">
											<div className="text-4xl mb-4">🎨</div>
											<div className="text-lg font-medium mb-2">Nhấp vào các nút phía trên để thêm node</div>
											<div className="text-sm">Chọn Node Mode để di chuyển, Relation Mode để tạo kết nối</div>
										</div>
									</div>
								)}
							</div>
						</div>

						{/* Fixed Action Buttons */}
						<div className="flex gap-2 justify-end px-6 py-4 border-t border-gray-200 bg-gray-50">
							<button
								onClick={closeDiagramPopup}
								className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
							>
								Hủy
							</button>
							<button
								onClick={exportDiagram}
								className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-blue-600 rounded-md hover:bg-blue-700 transition-colors"
							>
								Chèn sơ đồ
							</button>
						</div>
					</div>
				</div>
			)}
		</>
	);
};

export default DiagramEditor;
