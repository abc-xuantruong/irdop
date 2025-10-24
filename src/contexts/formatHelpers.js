/**
 * Helper functions for formatting and converting values
 */

/**
 * Convert special characters in value to HTML format
 * - Replaces * with ×
 * - Replaces ^ with <sup> (odd occurrences) and </sup> (even occurrences)
 * - Replaces _ with <sub> (odd occurrences) and </sub> (even occurrences)
 *
 * @param {string} value - The value to convert
 * @returns {string} - The converted value with HTML tags
 *
 * @example
 * convertValueToHTML('10^-5^') // Returns: '10<sup>-5</sup>'
 * convertValueToHTML('H_2_O') // Returns: 'H<sub>2</sub>O'
 * convertValueToHTML('10^3^ * 5') // Returns: '10<sup>3</sup> × 5'
 */
export const convertValueToHTML = (value) => {
	if (!value) return value;

	let result = value;

	// Replace * with ×
	result = result.replace(/\*/g, '×');

	// Replace ^ with <sup> and </sup> (odd/even occurrences)
	let caretCount = 0;
	result = result.replace(/\^/g, () => {
		caretCount++;
		return caretCount % 2 === 1 ? '<sup>' : '</sup>';
	});

	// Replace _ with <sub> and </sub> (odd/even occurrences)
	let underscoreCount = 0;
	result = result.replace(/_/g, () => {
		underscoreCount++;
		return underscoreCount % 2 === 1 ? '<sub>' : '</sub>';
	});

	return result;
};

/**
 * Convert HTML tags back to special characters for editing
 * - Removes <p> tags and other HTML tags
 * - Replaces <sub> with _
 * - Replaces </sub> with _
 * - Replaces <sup> with ^
 * - Replaces </sup> with ^
 * - Replaces × with *
 * - Decodes common HTML entities
 *
 * @param {string} value - The HTML value to convert back
 * @returns {string} - The converted value with special characters
 *
 * @example
 * convertHTMLToValue('10<sup>-5</sup>') // Returns: '10^-5^'
 * convertHTMLToValue('H<sub>2</sub>O') // Returns: 'H_2_O'
 * convertHTMLToValue('10<sup>3</sup> × 5') // Returns: '10^3^ * 5'
 * convertHTMLToValue('<p>10&nbsp;mg/L</p>') // Returns: '10 mg/L'
 */
export const convertHTMLToValue = (value) => {
	if (!value) return value;

	let result = value;

	// First, convert special HTML tags to special characters (before removing tags)
	result = result.replace(/<sub>/g, '_');
	result = result.replace(/<\/sub>/g, '_');
	result = result.replace(/<sup>/g, '^');
	result = result.replace(/<\/sup>/g, '^');
	result = result.replace(/×/g, '*');

	// Remove <p> tags specifically
	result = result.replace(/<\/?p[^>]*>/gi, '');

	// Remove other remaining HTML tags (but keep the converted special characters)
	result = result.replace(/<[^>]*>/g, '');

	// Decode HTML entities - handle both with and without semicolon
	// Common entities
	result = result
		.replace(/&nbsp;?/g, ' ')
		.replace(/&lt;?/g, '<')
		.replace(/&gt;?/g, '>')
		.replace(/&amp;?/g, '&')
		.replace(/&quot;?/g, '"')
		.replace(/&#39;?/g, "'")
		.replace(/&#96;?/g, '`');

	// Decode special symbols and Vietnamese characters
	const entities = {
		// Special symbols
		'&times': '*', // Convert times back to asterisk for editing
		'&divide': '÷',
		'&plusmn': '±',
		'&deg': '°',
		'&sup2': '²',
		'&sup3': '³',
		'&frac12': '½',
		'&frac14': '¼',
		'&hellip': '…',
		'&mdash': '—',
		'&ndash': '–',
		'&bull': '•',
		// Vietnamese uppercase
		'&Agrave': 'À',
		'&Aacute': 'Á',
		'&Acirc': 'Â',
		'&Atilde': 'Ã',
		'&Egrave': 'È',
		'&Eacute': 'É',
		'&Ecirc': 'Ê',
		'&Igrave': 'Ì',
		'&Iacute': 'Í',
		'&Ograve': 'Ò',
		'&Oacute': 'Ó',
		'&Ocirc': 'Ô',
		'&Otilde': 'Õ',
		'&Ugrave': 'Ù',
		'&Uacute': 'Ú',
		'&Yacute': 'Ý',
		// Vietnamese lowercase
		'&agrave': 'à',
		'&aacute': 'á',
		'&acirc': 'â',
		'&atilde': 'ã',
		'&egrave': 'è',
		'&eacute': 'é',
		'&ecirc': 'ê',
		'&igrave': 'ì',
		'&iacute': 'í',
		'&ograve': 'ò',
		'&oacute': 'ó',
		'&ocirc': 'ô',
		'&otilde': 'õ',
		'&ugrave': 'ù',
		'&uacute': 'ú',
		'&yacute': 'ý',
		'&ygrave': 'ỳ',
		'&ytilde': 'ỹ',
		'&yuml': 'ÿ',
	};

	// Replace entities with optional semicolon
	for (const [entity, character] of Object.entries(entities)) {
		// Match entity with optional semicolon at the end
		result = result.replace(new RegExp(entity + ';?', 'g'), character);
	}

	return result.trim();
};

/**
 * Convert HTML to plain text by removing tags and decoding entities
 * - Removes all HTML tags including <p> tags
 * - Decodes common HTML entities (&nbsp;, &lt;, &gt;, &amp;, etc.)
 * - Decodes Vietnamese characters (À, Á, â, ã, etc.)
 * - Decodes special symbols (×, ÷, °, ², ³, etc.)
 *
 * @param {string} html - The HTML string to convert
 * @returns {string} - Plain text without HTML tags and decoded entities
 *
 * @example
 * htmlToText('<p>Hello &amp; World</p>') // Returns: 'Hello & World'
 * htmlToText('<p>Nhiệt độ: 25&deg;C</p>') // Returns: 'Nhiệt độ: 25°C'
 * htmlToText('<p>10<sup>-5</sup> &times; 2</p>') // Returns: '10-5 × 2'
 */
export const htmlToText = (html) => {
	if (!html) return '';

	// Remove <p> tags specifically first
	let text = html.replace(/<\/?p[^>]*>/gi, '');

	// Remove all other HTML tags
	text = text.replace(/<[^>]*>/g, '');

	// Decode common HTML entities first - handle both with and without semicolon
	text = text
		.replace(/&nbsp;?/g, ' ')
		.replace(/&lt;?/g, '<')
		.replace(/&gt;?/g, '>')
		.replace(/&amp;?/g, '&')
		.replace(/&quot;?/g, '"')
		.replace(/&#39;?/g, "'")
		.replace(/&#96;?/g, '`');

	// Decode Vietnamese and special characters
	const entities = {
		// Vietnamese uppercase
		'&Agrave': 'À',
		'&Aacute': 'Á',
		'&Acirc': 'Â',
		'&Atilde': 'Ã',
		'&Egrave': 'È',
		'&Eacute': 'É',
		'&Ecirc': 'Ê',
		'&Igrave': 'Ì',
		'&Iacute': 'Í',
		'&Ograve': 'Ò',
		'&Oacute': 'Ó',
		'&Ocirc': 'Ô',
		'&Otilde': 'Õ',
		'&Ugrave': 'Ù',
		'&Uacute': 'Ú',
		'&Yacute': 'Ý',
		// Vietnamese lowercase
		'&agrave': 'à',
		'&aacute': 'á',
		'&acirc': 'â',
		'&atilde': 'ã',
		'&egrave': 'è',
		'&eacute': 'é',
		'&ecirc': 'ê',
		'&igrave': 'ì',
		'&iacute': 'í',
		'&ograve': 'ò',
		'&oacute': 'ó',
		'&ocirc': 'ô',
		'&otilde': 'õ',
		'&ugrave': 'ù',
		'&uacute': 'ú',
		'&yacute': 'ý',
		'&ygrave': 'ỳ',
		'&ytilde': 'ỹ',
		'&yuml': 'ÿ',
		// Special symbols
		'&hellip': '…',
		'&mdash': '—',
		'&ndash': '–',
		'&bull': '•',
		'&times': '×',
		'&divide': '÷',
		'&plusmn': '±',
		'&deg': '°',
		'&sup2': '²',
		'&sup3': '³',
		'&frac12': '½',
		'&frac14': '¼',
		'&copy': '©',
		'&reg': '®',
		'&trade': '™',
		// Quotation marks
		'&laquo': '«',
		'&raquo': '»',
		'&ldquo': '"',
		'&rdquo': '"',
		'&lsquo': '\u2018',
		'&rsquo': '\u2019',
		'&bdquo': '„',
		'&lsaquo': '‹',
		'&rsaquo': '›',
	};

	// Replace all entities with optional semicolon
	for (const [entity, character] of Object.entries(entities)) {
		// Match entity with optional semicolon at the end
		text = text.replace(new RegExp(entity + ';?', 'g'), character);
	}

	return text;
};
