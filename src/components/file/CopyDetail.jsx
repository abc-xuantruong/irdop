import React, { useState } from 'react';
import { apiPost } from '../../contexts/helperFunctionCallAPI';
import { toast } from 'react-toastify';

const CopyDetail = ({ copyData, onUpdate }) => {
	const [isEditing, setIsEditing] = useState(false);
	const [editData, setEditData] = useState(copyData || {});
	const [saving, setSaving] = useState(false);

	if (!copyData) {
		return <div className="p-4 text-gray-500 text-left">No copy data</div>;
	}

	const handleFieldChange = (field, value) => {
		setEditData((prev) => ({ ...prev, [field]: value }));
	};

	const handleArrayChange = (field, value) => {
		const array = value
			.split(',')
			.map((item) => item.trim())
			.filter((item) => item);
		setEditData((prev) => ({ ...prev, [field]: array }));
	};

	const handleUpdate = async () => {
		setSaving(true);
		try {
			const response = await apiPost('https://red.irdop.org/v1/copy/update', {
				docCopy: editData,
			});

			if (response.status === 200 || response.status === 201) {
				toast.success('Doc copy updated successfully');
				setIsEditing(false);
				if (onUpdate) onUpdate(editData);
			} else {
				toast.error('Failed to update doc copy');
			}
		} catch (error) {
			console.error('Error updating doc copy:', error);
			toast.error('Error updating doc copy: ' + (error.message || 'Unknown error'));
		} finally {
			setSaving(false);
		}
	};

	const handleCancel = () => {
		setEditData(copyData);
		setIsEditing(false);
	};

	const renderField = (label, field, value) => {
		const displayValue = value ?? '-';
		return (
			<div className="text-left">
				<label className="block text-sm font-semibold text-gray-700 mb-1">{label}</label>
				{isEditing ? (
					<input
						type="text"
						value={editData[field] || ''}
						onChange={(e) => handleFieldChange(field, e.target.value)}
						className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-left text-sm focus:ring-2 focus:ring-blue-500"
					/>
				) : (
					<input
						type="text"
						value={displayValue}
						readOnly
						className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-left text-sm"
					/>
				)}
			</div>
		);
	};

	const renderTextarea = (label, field, value, rows = 3) => {
		const displayValue = Array.isArray(value)
			? value.length > 0
				? value.join(', ')
				: '-'
			: typeof value === 'object'
			? JSON.stringify(value, null, 2)
			: value || '-';

		return (
			<div className="text-left">
				<label className="block text-sm font-semibold text-gray-700 mb-1">{label}</label>
				{isEditing ? (
					<textarea
						value={
							Array.isArray(editData[field])
								? editData[field].join(', ')
								: typeof editData[field] === 'object'
								? JSON.stringify(editData[field], null, 2)
								: editData[field] || ''
						}
						onChange={(e) => {
							if (Array.isArray(editData[field])) {
								handleArrayChange(field, e.target.value);
							} else if (typeof editData[field] === 'object') {
								try {
									const parsed = JSON.parse(e.target.value);
									handleFieldChange(field, parsed);
								} catch {
									// Keep as string if invalid JSON
									handleFieldChange(field, e.target.value);
								}
							} else {
								handleFieldChange(field, e.target.value);
							}
						}}
						rows={rows}
						className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-left text-sm font-mono resize-none focus:ring-2 focus:ring-blue-500"
					/>
				) : (
					<textarea
						value={displayValue}
						readOnly
						rows={rows}
						className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-left text-sm font-mono resize-none"
					/>
				)}
			</div>
		);
	};

	return (
		<div className="p-4 space-y-4">
			<div className="flex justify-between items-center mb-4 pb-2 border-b">
				<h3 className="text-lg font-bold text-left">Doc Copy</h3>
				<div className="flex gap-2">
					{!isEditing ? (
						<button
							onClick={() => setIsEditing(true)}
							className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
						>
							Edit
						</button>
					) : (
						<>
							<button
								onClick={handleCancel}
								disabled={saving}
								className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 text-sm disabled:opacity-50"
							>
								Cancel
							</button>
							<button
								onClick={handleUpdate}
								disabled={saving}
								className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 text-sm disabled:opacity-50"
							>
								{saving ? 'Updating...' : 'Update'}
							</button>
						</>
					)}
				</div>
			</div>

			<div className="space-y-3">
				{renderField('id', 'id', editData.id)}
				{renderField('createdAt', 'createdAt', editData.createdAt)}
				{renderField('modifiedAt', 'modifiedAt', editData.modifiedAt)}
				{renderField('fileId', 'fileId', editData.fileId)}
				{renderField('mimeType', 'mimeType', editData.mimeType)}
				{renderField('startPage', 'startPage', editData.startPage)}
				{renderField('endPage', 'endPage', editData.endPage)}
				{renderField('totalPages', 'totalPages', editData.totalPages)}
				{renderField('classifierCode', 'classifierCode', editData.classifierCode)}
				{renderField('copyType', 'copyType', editData.copyType)}
				{renderField('docId', 'docId', editData.docId)}
				{renderField('editId', 'editId', editData.editId)}

				{renderTextarea('foreignKeyUIDs', 'foreignKeyUIDs', editData.foreignKeyUIDs, 2)}

				{editData.metadata && renderTextarea('metadata', 'metadata', editData.metadata, 4)}

				{editData.jsonContent && renderTextarea('jsonContent', 'jsonContent', editData.jsonContent, 12)}
			</div>
		</div>
	);
};

export default CopyDetail;
