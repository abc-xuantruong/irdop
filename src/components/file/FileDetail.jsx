import React, { useState } from 'react';
import { apiPost } from '../../contexts/helperFunctionCallAPI';
import { toast } from 'react-toastify';

const FileDetail = ({ fileData, onUpdate }) => {
	const [isEditing, setIsEditing] = useState(false);
	const [editData, setEditData] = useState(fileData || {});
	const [saving, setSaving] = useState(false);

	if (!fileData) {
		return <div className="p-4 text-gray-500 text-left">No file data</div>;
	}

	const handleFieldChange = (path, value) => {
		setEditData((prev) => {
			const newData = { ...prev };
			const keys = path.split('.');

			if (keys.length === 1) {
				newData[keys[0]] = value;
			} else if (keys.length === 2) {
				newData[keys[0]] = { ...newData[keys[0]], [keys[1]]: value };
			}

			return newData;
		});
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
			const response = await apiPost('https://red.irdop.org/v1/file/update/file', {
				fileRecord: editData,
			});

			if (response.status === 200 || response.status === 201) {
				toast.success('File updated successfully');
				setIsEditing(false);
				if (onUpdate) onUpdate(editData);
			} else {
				toast.error('Failed to update file');
			}
		} catch (error) {
			console.error('Error updating file:', error);
			toast.error('Error updating file: ' + (error.message || 'Unknown error'));
		} finally {
			setSaving(false);
		}
	};

	const handleCancel = () => {
		setEditData(fileData);
		setIsEditing(false);
	};

	const renderField = (label, path, value) => {
		const displayValue = value ?? '-';
		return (
			<div className="text-left">
				<label className="block text-sm font-semibold text-gray-700 mb-1">{label}</label>
				{isEditing ? (
					<input
						type="text"
						value={path.includes('.') ? editData[path.split('.')[0]]?.[path.split('.')[1]] || '' : editData[path] || ''}
						onChange={(e) => handleFieldChange(path, e.target.value)}
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
		const displayValue = Array.isArray(value) ? (value.length > 0 ? value.join(', ') : '-') : value || '-';

		return (
			<div className="text-left">
				<label className="block text-sm font-semibold text-gray-700 mb-1">{label}</label>
				{isEditing ? (
					<textarea
						value={Array.isArray(editData[field]) ? editData[field].join(', ') : editData[field] || ''}
						onChange={(e) => handleArrayChange(field, e.target.value)}
						rows={rows}
						className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-left text-sm font-mono resize-none focus:ring-2 focus:ring-blue-500"
					/>
				) : (
					<textarea
						value={displayValue}
						readOnly
						rows={rows}
						className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-left text-sm resize-none"
					/>
				)}
			</div>
		);
	};

	return (
		<div className="p-4 space-y-4">
			<div className="flex justify-between items-center mb-4 pb-2 border-b">
				<h3 className="text-lg font-bold text-left">File Record</h3>
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
				{renderField('appUID', 'appUID', editData.appUID)}
				{renderField('objectStatus', 'objectStatus', editData.objectStatus)}
				{renderField('bucketName', 'bucketName', editData.bucketName)}
				{renderField('objectName', 'objectName', editData.objectName)}
				{renderField('identityUID', 'identityUID', editData.identityUID)}
				{renderField('signedBy', 'signedBy', editData.signedBy)}
				{renderField('createdAt', 'createdAt', editData.createdAt)}
				{renderField('modifiedAt', 'modifiedAt', editData.modifiedAt)}
				{renderField('deletedAt', 'deletedAt', editData.deletedAt)}

				{/* originInfo */}
				{editData.originInfo && (
					<>
						<div className="text-left mt-4 pt-4 border-t">
							<h4 className="text-sm font-bold text-gray-800 mb-3">originInfo</h4>
						</div>
						{renderField('originInfo.fileName', 'originInfo.fileName', editData.originInfo.fileName)}
						{renderField('originInfo.mimeType', 'originInfo.mimeType', editData.originInfo.mimeType)}
						{renderField('originInfo.fileSize', 'originInfo.fileSize', editData.originInfo.fileSize)}
					</>
				)}

				{/* Arrays */}
				{renderTextarea('foreignKeyUIDs', 'foreignKeyUIDs', editData.foreignKeyUIDs)}
				{renderTextarea('userTags', 'userTags', editData.userTags)}
			</div>
		</div>
	);
};

export default FileDetail;
