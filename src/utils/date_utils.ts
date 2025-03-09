/**
 * Safely checks if a value is a valid Date
 * @param value - The value to check
 * @returns true if the value is a valid Date, false otherwise
 */
export const isValidDate = (value: any): boolean => {
	if (!value) return false;

	const date = value instanceof Date ? value : new Date(value);
	return !isNaN(date.getTime());
};

/**
 * Safely formats a date into DD/MM/YYYY format
 * @param date - The date to format
 * @returns A formatted date string or empty string if invalid
 */
export const formatDate = (date: Date | string | null | undefined): string => {
	if (!date) return '';

	try {
		const dateObj = date instanceof Date ? date : new Date(date);

		// Check if date is valid
		if (isNaN(dateObj.getTime())) {
			console.warn('Invalid date provided to formatDate:', date);
			return '';
		}

		const day = String(dateObj.getDate()).padStart(2, '0');
		const month = String(dateObj.getMonth() + 1).padStart(2, '0');
		const year = dateObj.getFullYear();

		return `${day}/${month}/${year}`;
	} catch (error) {
		console.error('Error in formatDate:', error);
		return '';
	}
};

/**
 * A wrapper for formatDate that catches any exception
 */
export const safeDateFormat = (date: any): string => {
	try {
		return formatDate(date);
	} catch (error) {
		console.error('Error in safeDateFormat:', error);
		return '';
	}
};

/**
 * Parses a date string in DD/MM/YYYY format to a Date object
 * @param dateString - The date string to parse
 * @returns A Date object or null if invalid
 */
export const parseDateString = (dateString: string): Date | null => {
	if (!dateString) return null;

	try {
		const [day, month, year] = dateString.split('/').map(Number);
		if (!day || !month || !year) return null;

		const date = new Date(year, month - 1, day);
		return isValidDate(date) ? date : null;
	} catch (error) {
		console.error('Error parsing date string:', error);
		return null;
	}
};
