// Test functions for content comparison logic
// This file demonstrates how the content normalization works

// Helper function to normalize content for comparison (especially for TinyMCE)
const normalizeContent = (content) => {
	if (!content || typeof content !== 'string') return '';

	// Remove leading <p> and trailing </p> tags for TinyMCE content
	let normalized = content.trim();
	if (normalized.startsWith('<p>') && normalized.endsWith('</p>')) {
		normalized = normalized.slice(3, -4);
	}

	// Remove other common HTML artifacts that TinyMCE might add
	normalized = normalized.replace(/&nbsp;/g, ' ').trim();

	return normalized;
};

// Helper function to check if content has actually changed
const hasContentChanged = (newContent, currentData, analysisId, column) => {
	const currentItem = currentData.find((item) => item.id === analysisId);
	if (!currentItem) return true; // If item not found, assume it changed

	const currentValue = currentItem[column] || '';
	const normalizedNew = normalizeContent(newContent);
	const normalizedCurrent = normalizeContent(currentValue);

	return normalizedNew !== normalizedCurrent;
};

// Test cases
console.log('=== Testing Content Normalization ===');

// Test case 1: Basic TinyMCE content
const tinymceContent1 = '<p>Hello World</p>';
const plainContent1 = 'Hello World';
console.log('TinyMCE content:', tinymceContent1);
console.log('Plain content:', plainContent1);
console.log('Normalized TinyMCE:', normalizeContent(tinymceContent1));
console.log('Normalized plain:', normalizeContent(plainContent1));
console.log('Are they equal?', normalizeContent(tinymceContent1) === normalizeContent(plainContent1));
console.log('');

// Test case 2: Content with &nbsp;
const tinymceContent2 = '<p>Hello&nbsp;World</p>';
const plainContent2 = 'Hello World';
console.log('TinyMCE with &nbsp;:', tinymceContent2);
console.log('Plain content:', plainContent2);
console.log('Normalized TinyMCE:', normalizeContent(tinymceContent2));
console.log('Normalized plain:', normalizeContent(plainContent2));
console.log('Are they equal?', normalizeContent(tinymceContent2) === normalizeContent(plainContent2));
console.log('');

// Test case 3: Empty content
const tinymceEmpty = '<p></p>';
const plainEmpty = '';
console.log('TinyMCE empty:', tinymceEmpty);
console.log('Plain empty:', plainEmpty);
console.log('Normalized TinyMCE:', normalizeContent(tinymceEmpty));
console.log('Normalized plain:', normalizeContent(plainEmpty));
console.log('Are they equal?', normalizeContent(tinymceEmpty) === normalizeContent(plainEmpty));
console.log('');

// Test case 4: Complex content that should be different
const tinymceComplex = '<p>Result: 10.5 mg/L</p>';
const plainComplex = 'Result: 11.0 mg/L';
console.log('TinyMCE complex:', tinymceComplex);
console.log('Plain complex:', plainComplex);
console.log('Normalized TinyMCE:', normalizeContent(tinymceComplex));
console.log('Normalized plain:', normalizeContent(plainComplex));
console.log('Are they equal?', normalizeContent(tinymceComplex) === normalizeContent(plainComplex));
console.log('');

// Test case 5: hasContentChanged function
const mockData = [
	{ id: 1, result_value: 'Hello World', result_unit: 'mg/L' },
	{ id: 2, result_value: '<p>Test Result</p>', result_unit: 'ppm' },
];

console.log('=== Testing hasContentChanged Function ===');
console.log('Mock data:', mockData);
console.log('');

// Test with same content (should return false)
console.log('Test 1: Same content');
console.log('Current value:', mockData[0].result_value);
console.log('New value:', 'Hello World');
console.log('Has changed?', hasContentChanged('Hello World', mockData, 1, 'result_value'));
console.log('');

// Test with TinyMCE equivalent content (should return false)
console.log('Test 2: TinyMCE equivalent content');
console.log('Current value:', mockData[0].result_value);
console.log('New value:', '<p>Hello World</p>');
console.log('Has changed?', hasContentChanged('<p>Hello World</p>', mockData, 1, 'result_value'));
console.log('');

// Test with different content (should return true)
console.log('Test 3: Different content');
console.log('Current value:', mockData[0].result_value);
console.log('New value:', 'Different Value');
console.log('Has changed?', hasContentChanged('Different Value', mockData, 1, 'result_value'));
console.log('');

// Test with non-existent ID (should return true)
console.log('Test 4: Non-existent ID');
console.log('Has changed?', hasContentChanged('Any Value', mockData, 999, 'result_value'));
console.log('');

console.log('=== All tests completed ===');
