const { createCache, getCache } = global.get('cache.js');
const { cError, handleError, localDir } = global.get('utilities.js');
const { Session } = global.get('entities.js');
const { s3Clients, LimsPools } = global.get('services.js');
const { v4: uuidv4 } = global.get('uuid');
const fs = global.get('fs');
const fsPromises = fs.promises;
const path = global.get('path');

const MAX_FILE_SIZE = 1024 * 1024 * 250; // 250MB

const UniFileCache = createCache('UniFileCache', 60 * 60 * 24); // 24 hours

class UniFile {
	#session;
	#userTags = new Set();
	#systemTags = new Set();

	constructor(fileRecord, session) {
		UniFile.validateFileRecord(fileRecord);
		if (!(session instanceof Session)) throw new cError(401, 'Invalid session');

		this.#session = session;
		this.#userTags = new Set(UniFile.#convertTags(fileRecord.userTags));
		this.#systemTags = new Set(UniFile.#convertTags(fileRecord.systemTags));
		Object.assign(this, fileRecord);
	}

	get fileName() {
		return this.originInfo.fileName;
	}
	get mimeType() {
		return this.originInfo.mimeType;
	}
	get db() {
		return LimsPools[this.#session.appUID];
	}
	get s3() {
		return s3Clients[this.#session.appUID];
	}

	static async uplink(fileRecord, session, expiry = 60 * 10) {
		try {
			if (!fileRecord || typeof fileRecord !== 'object')
				throw new cError(400, `Invalid input: fileRecord must be an object`);
			if (!session || !(session instanceof Session))
				throw new cError(400, `Invalid input: session must be an instance of Session`);

			const { originInfo, id, createdAt, objectPath, foreignKeyUIDs, userTags, systemTags, contentUIDs } = fileRecord;
			const { identityUID, appUID } = session;
			const { fileName, mimeType, fileSize } = originInfo;

			if (!objectPath || !originInfo)
				throw new cError(400, `Invalid input: id, bucketName, objectName, and originInfo are required`);
			if (!fileName || !mimeType) throw new cError(400, `Invalid input: fileName, mimeType, and fileSize are required`);

			const db = LimsPools[appUID];
			const s3 = s3Clients[appUID];
			const bucketName = s3.bucketName;

			if (!db) throw new cError(500, `Database not found`);
			if (!s3) throw new cError(500, `S3 client not found`);

			const safeFileName = fileName.replace(/[^a-zA-Z0-9.\-_]/g, '_');

			const metadata = {
				'Content-Type': mimeType,
				'x-amz-meta-file-name': safeFileName,
				'x-amz-meta-file-size': fileSize?.toString() || '0',
				'x-amz-meta-file-identity-uid': identityUID,
				'x-amz-meta-file-app-uid': appUID || '',
				'x-amz-meta-file-foreign-key-uids': Array.isArray(foreignKeyUIDs) ? foreignKeyUIDs.join(',') : '',
				'x-amz-meta-file-user-tags': Array.isArray(userTags) ? userTags.join(',') : '',
				'x-amz-meta-file-system-tags': Array.isArray(systemTags) ? systemTags.join(',') : '',
				'x-amz-meta-file-content-uids': Array.isArray(contentUIDs) ? contentUIDs.join(',') : '',
			};

			const metadataSize = JSON.stringify(metadata).length;
			if (metadataSize > 2048) {
				throw new cError(400, `Metadata size exceeds 2KB limit: ${metadataSize}`);
			}

			// UPLOAD TO DB FIRST (FOR FILE RECORD)
			const newRecord = await UniFile.uploadFile(fileRecord, session);
			node.warn({ newRecord });

			const presignedUrl = await s3.presignedUrl('PUT', bucketName, newRecord.objectName, expiry, metadata);
			return presignedUrl;
		} catch (error) {
			handleError(error, 'UniFile.uplink');
			throw new cError(500, `Failed to generate upload URL`);
		}
	}

	async downlink(expiry = 60 * 10, mode = 'view') {
		try {
			// Validate required fields
			if (!this.bucketName || !this.objectName || !this.fileName) {
				throw new cError(400, `[ UniFile / downlink ] Missing required fields for download URL`);
			}
			if (!this.mimeType || !/^[a-zA-Z0-9-]+\/[a-zA-Z0-9-+.]+$/.test(this.mimeType)) {
				throw new cError(400, `[ UniFile / downlink ] Invalid MIME type`);
			}

			// Sanitize filename
			const safeFileName = this.fileName.replace(/[^a-zA-Z0-9.\-_]/g, '_');

			const disposition = mode === 'download' ? `attachment; filename="${safeFileName}"` : 'inline';

			const presignedUrl = await this.s3.presignedUrl('GET', this.bucketName, this.objectName, expiry, {
				'response-content-disposition': disposition,
				'response-content-type': this.mimeType,
			});

			return presignedUrl;
		} catch (error) {
			handleError(error, 'UniFile.downlink');
			throw new cError(500, `[ UniFile / downlink ] Failed to generate download/view URL`);
		}
	}

	addUserTags(tags) {
		if (!tags || !Array.isArray(tags)) throw new cError(400, `Invalid tags: ${tags}. Must be an array.`);
		if (tags.length === 0) return this;

		tags.forEach((tag) => {
			if (typeof tag === 'string') {
				this.#userTags.add(tag);
			} else if (typeof tag === 'object' && tag !== null) {
				const [key] = Object.keys(tag);
				if (key) this.#userTags.add({ [key]: tag[key] });
			}
		});
		return this;
	}

	removeUserTags(tags) {
		if (!tags || !Array.isArray(tags)) throw new cError(400, `Invalid tags: ${tags}. Must be an array.`);
		if (tags.length === 0) return this;

		tags.forEach((tag) => {
			if (typeof tag === 'string') {
				if (tag.includes(':')) {
					// Remove specific key:value pair
					this.#userTags.forEach((t) => {
						if (typeof t === 'string' && t === tag) {
							this.#userTags.delete(t);
						} else if (typeof t === 'object' && t !== null) {
							const [key] = Object.keys(t);
							const value = t[key];
							if (key === tag.split(':')[0] && value === tag.split(':')[1]) {
								this.#userTags.delete(t);
							}
						}
					});
				} else {
					// Remove all tags with this key
					this.#userTags.forEach((t) => {
						if (typeof t === 'string' && t.split(':')[0] === tag) {
							this.#userTags.delete(t);
						} else if (typeof t === 'object' && t !== null) {
							const [key] = Object.keys(t);
							if (key === tag) {
								this.#userTags.delete(t);
							}
						}
					});
				}
			} else if (typeof tag === 'object' && tag !== null) {
				// Remove specific key-value object
				const [key] = Object.keys(tag);
				const value = tag[key];
				if (key) {
					this.#userTags.forEach((t) => {
						if (typeof t === 'string' && t === `${key}:${value}`) {
							this.#userTags.delete(t);
						} else if (typeof t === 'object' && t !== null) {
							const [tKey] = Object.keys(t);
							const tValue = t[tKey];
							if (tKey === key && tValue === value) {
								this.#userTags.delete(t);
							}
						}
					});
				}
			}
		});
		return this;
	}

	addSystemTags(tags) {
		if (!tags || !Array.isArray(tags)) throw new cError(400, `Invalid tags: ${tags}. Must be an array.`);
		if (tags.length === 0) return this;

		tags.forEach((tag) => {
			if (typeof tag === 'string') {
				this.#systemTags.add(tag);
			} else if (typeof tag === 'object' && tag !== null) {
				const [key] = Object.keys(tag);
				if (key) this.#systemTags.add({ [key]: tag[key] });
			}
		});
		return this;
	}

	removeSystemTags(tags) {
		if (!tags || !Array.isArray(tags)) throw new cError(400, `Invalid tags: ${tags}. Must be an array.`);
		if (tags.length === 0) return this;

		tags.forEach((tag) => {
			if (typeof tag === 'string') {
				if (tag.includes(':')) {
					// Remove specific key:value pair
					this.#systemTags.forEach((t) => {
						if (typeof t === 'string' && t === tag) {
							this.#systemTags.delete(t);
						} else if (typeof t === 'object' && t !== null) {
							const [key] = Object.keys(t);
							const value = t[key];
							if (key === tag.split(':')[0] && value === tag.split(':')[1]) {
								this.#systemTags.delete(t);
							}
						}
					});
				} else {
					// Remove all tags with this key
					this.#systemTags.forEach((t) => {
						if (typeof t === 'string' && t.split(':')[0] === tag) {
							this.#systemTags.delete(t);
						} else if (typeof t === 'object' && t !== null) {
							const [key] = Object.keys(t);
							if (key === tag) {
								this.#systemTags.delete(t);
							}
						}
					});
				}
			} else if (typeof tag === 'object' && tag !== null) {
				// Remove specific key-value object
				const [key] = Object.keys(tag);
				const value = tag[key];
				if (key) {
					this.#systemTags.forEach((t) => {
						if (typeof t === 'string' && t === `${key}:${value}`) {
							this.#systemTags.delete(t);
						} else if (typeof t === 'object' && t !== null) {
							const [tKey] = Object.keys(t);
							const tValue = t[tKey];
							if (tKey === key && tValue === value) {
								this.#systemTags.delete(t);
							}
						}
					});
				}
			}
		});
		return this;
	}

	async updateFile(data = {}) {
		if (!data || typeof data !== 'object') data = {};
		if (data.id && data.id !== this.id) return null;

		const blacklistFields = ['id', 'bucketName', 'objectName', 'identityUID', 'appUID', 'systemTags', 'userTags'];
		const filteredData = {};
		for (const [key, value] of Object.entries(data)) {
			if (!blacklistFields.includes(key)) {
				filteredData[key] = value;
			}
		}

		// Only include tags in update if they have content
		if (this.#userTags.size > 0) {
			const serializedUserTags = UniFile.#serializeTags([...this.#userTags]);
			if (serializedUserTags !== null) {
				filteredData.userTags = serializedUserTags;
				this.userTags = [...this.#userTags];
			}
		} else if (this.#userTags.size === 0 && this.userTags) {
			// If tags were cleared, set to empty array instead of empty string
			filteredData.userTags = [];
			this.userTags = [];
		}

		if (this.#systemTags.size > 0) {
			const serializedSystemTags = UniFile.#serializeTags([...this.#systemTags]);
			if (serializedSystemTags !== null) {
				filteredData.systemTags = serializedSystemTags;
				this.systemTags = [...this.#systemTags];
			}
		} else if (this.#systemTags.size === 0 && this.systemTags) {
			// If tags were cleared, set to empty array instead of empty string
			filteredData.systemTags = [];
			this.systemTags = [];
		}

		if (Object.keys(filteredData).length === 0) return this;

		try {
			const { quotedColumns, values } = await this.db.getColumnsAndValues('File', filteredData);
			const setClause = quotedColumns
				.split(',')
				.map((column, index) => `${column} = $${index + 1}`)
				.join(', ');
			const query = {
				text: `UPDATE "File" SET ${setClause} WHERE "id" = $${values.length + 1} RETURNING *`,
				values: [...values, this.id],
			};

			const {
				rows: [fileRecord],
			} = await this.db.query(query.text, query.values);
			if (!fileRecord) throw new cError(404, 'File not found or update failed');

			UniFileCache.set(`UniFile:${this.id}`, fileRecord);
			return new UniFile(fileRecord, this.#session);
		} catch (error) {
			handleError(error, 'UniFile.updateFile');
			throw error;
		}
	}

	async stream() {
		try {
			return await this.s3.getObject(this.bucketName, this.objectName);
		} catch (error) {
			handleError(error, 'UniFile.stream');
			return null;
		}
	}

	async buffer() {
		try {
			let localPath = this.localPath || (await this.getLocalPath());
			if (!localPath) {
				localPath = await this.download();
				if (!localPath) {
					throw new cError(404, 'Failed to download file from S3');
				}
			}
			return await fsPromises.readFile(localPath);
		} catch (error) {
			handleError(error, 'UniFile.buffer');
			return null;
		}
	}

	async download() {
		try {
			const existingPath = await this.getLocalPath();
			if (existingPath) {
				this.localPath = existingPath;
				return existingPath;
			}

			const fileStream = await this.s3.getObject(this.bucketName, this.objectName);
			const localDirPath = localDir('s3');
			const localPath = path.join(localDirPath, this.id);

			await fsPromises.mkdir(localDirPath, { recursive: true });
			await fsPromises.writeFile(localPath, fileStream);
			this.localPath = localPath;
			return localPath;
		} catch (error) {
			handleError(error, 'UniFile.download');
			return null;
		}
	}

	async getLocalPath() {
		try {
			if (
				this.localPath &&
				(await fsPromises
					.access(this.localPath)
					.then(() => true)
					.catch(() => false))
			) {
				return this.localPath;
			}

			const defaultPath = path.join(localDir('s3'), this.id);
			if (
				await fsPromises
					.access(defaultPath)
					.then(() => true)
					.catch(() => false)
			) {
				this.localPath = defaultPath;
				return defaultPath;
			}

			return null;
		} catch (error) {
			handleError(error, 'UniFile.getLocalPath');
			return null;
		}
	}

	static async uploadFile(fileRecord, session) {
		if (!(session instanceof Session)) throw new cError(401, 'Invalid session');

		if (fileRecord.id) return await UniFile.getFile(fileRecord.id, session);
		if (!fileRecord?.localPath && (!fileRecord?.originInfo || !fileRecord?.objectPath)) {
			throw new cError(400, 'Invalid or missing file properties');
		}
		fileRecord.fileCategory ??= [];

		const s3 = s3Clients[session.appUID];
		const db = LimsPools[session.appUID];
		const id = UniFile.genUID();

		try {
			await db.query('BEGIN');
			// PREPARE FILE RECORD
			Object.assign(fileRecord, {
				id: id,
				bucketName: s3.bucketName,
				objectName: `${fileRecord.objectPath}/${id}`,
				identityUID: session.identityUID,
				appUID: session.appUID,
				objectStatus: 'UPLOADING',
			});

			if (fileRecord.userTags) {
				const serializedUserTags = UniFile.#serializeTags(fileRecord.userTags);
				if (serializedUserTags !== null) {
					fileRecord.userTags = serializedUserTags;
				}
			}
			if (fileRecord.systemTags) {
				const serializedSystemTags = UniFile.#serializeTags(fileRecord.systemTags);
				if (serializedSystemTags !== null) {
					fileRecord.systemTags = serializedSystemTags;
				}
			}

			const metadata = {
				'Content-Type': fileRecord.originInfo.mimeType || 'application/octet-stream',
				'x-amz-meta-file-uid': fileRecord.id,
				'x-amz-meta-file-name': fileRecord.originInfo.fileName || 'unknown',
				'x-amz-meta-file-size': fileRecord.originInfo.fileSize?.toString() || '0',
				'x-amz-meta-file-created-at': fileRecord.createdAt?.toISOString() || new Date().toISOString(),
				'x-amz-meta-file-identity-uid': session.identityUID,
				'x-amz-meta-file-app-uid': session.appUID,
				'x-amz-meta-file-foreign-key-uids': fileRecord.foreignKeyUIDs?.join(',') || '',
				'x-amz-meta-file-user-tags': Array.isArray(fileRecord.userTags) ? fileRecord.userTags.join(',') : '',
				'x-amz-meta-file-system-tags': Array.isArray(fileRecord.systemTags) ? fileRecord.systemTags.join(',') : '',
				'x-amz-meta-file-content-uids': fileRecord.contentUIDs?.join(',') || '',
			};

			// UPLOAD TO DB FIRST (FOR FILE RECORD)
			let newRecord;
			node.warn(newRecord);

			try {
				const { quotedColumns, values } = await db.getColumnsAndValues('File', fileRecord);
				const query = {
					text: `INSERT INTO "File" (${quotedColumns}) VALUES (${values
						.map((_, i) => `$${i + 1}`)
						.join(', ')}) RETURNING *`,
					values: values,
				};

				const {
					rows: [insertedRecord],
				} = await db.query(query.text, query.values);
				node.warn({ insertedRecord });

				if (!insertedRecord) throw new cError(400, 'Failed to create file record');
				newRecord = insertedRecord;
			} catch (dbError) {
				node.warn(`[UniFile.uploadFile] Database insertion failed: ${dbError.message}`);
				throw dbError;
			}

			// UPLOAD RIGHT FROM LOCAL PATH IF AVAILABLE
			if (fileRecord.localPath) {
				const stats = await fsPromises.stat(fileRecord.localPath).catch(() => {
					throw new cError(400, 'File does not exist');
				});
				if (stats.size > MAX_FILE_SIZE) throw new cError(400, `File size exceeds ${MAX_FILE_SIZE} MB limit`);

				const fileStream = fs.createReadStream(fileRecord.localPath);
				try {
					await s3.putObject(fileRecord.bucketName, fileRecord.objectName, fileStream, metadata);
					if (!(await s3.statObject(fileRecord.bucketName, fileRecord.objectName))) {
						throw new cError(400, 'Failed to verify S3 upload');
					}

					const {
						rows: [uploadedRecord],
					} = await db.query('UPDATE "File" SET "objectStatus" = $1 WHERE "id" = $2 RETURNING *', ['OK', newRecord.id]); // quickupdate
					UniFileCache.set(`UniFile:${uploadedRecord.id}`, uploadedRecord);

					// COMMIT the transaction before returning
					await db.query('COMMIT');

					return new UniFile(uploadedRecord, session);
				} finally {
					fileStream.close();
				}
			}

			await db.query('COMMIT');
			return new UniFile(newRecord, session);
		} catch (error) {
			await db.query('ROLLBACK').catch((rollbackError) => {
				handleError(rollbackError, 'UniFile.uploadFile rollback');
			});
			handleError(error, 'UniFile.uploadFile');
			throw error;
		}
	}

	static genUID() {
		return `file_${uuidv4().replace(/-/g, '').substring(0, 11)}`;
	}

	static validateFileRecord(fileRecord) {
		if (typeof fileRecord !== 'object') throw new cError(400, 'Invalid file record');

		if (!fileRecord.id) throw new cError(400, 'id is required');
		if (!fileRecord.bucketName) throw new cError(400, 'bucketName is required');
		if (!fileRecord.objectName) throw new cError(400, 'objectName is required');
		if (!fileRecord.originInfo) throw new cError(400, 'originInfo is required');
		if (!fileRecord.appUID) throw new cError(400, 'appUID is required');

		return fileRecord;
	}

	static async getFile(id, session) {
		if (!id) return null;
		if (!(session instanceof Session)) throw new cError(401, 'Invalid session');
		const db = LimsPools[session.appUID];
		const s3 = s3Clients[session.appUID];
		if (!db) throw new cError(500, 'Database not found');
		if (!s3) throw new cError(500, 'S3 client not found');

		try {
			let fileRecord = null;
			const cacheKey = `UniFile:${id}`;
			const cachedFile = await UniFileCache.get(cacheKey);
			if (cachedFile) {
				node.warn(`[UniFile] Found cached file: ${id}`);
				fileRecord = cachedFile;
			} else {
				const query = {
					text: `SELECT * FROM "File" WHERE "id" = $1`,
					values: [id],
				};
				const result = await db.query(query.text, query.values);
				fileRecord = result.rows[0] || null;
			}

			if (fileRecord) {
				fileRecord.userTags = UniFile.#convertTags(fileRecord.userTags);
				fileRecord.systemTags = UniFile.#convertTags(fileRecord.systemTags);

				const exists = await s3.statObject(fileRecord.bucketName, fileRecord.objectName);
				if (exists) {
					node.warn(`[UniFile] Found file in s3: ${id}`);
					UniFileCache.set(cacheKey, fileRecord);
					return new UniFile(fileRecord, session);
				}
			}
			return null;
		} catch (error) {
			handleError(error, 'UniFile.getFile');
			return null;
		}
	}

	static async findSystemTags(matchingTags = [], session) {
		if (!matchingTags || !Array.isArray(matchingTags)) return [];
		if (matchingTags.length === 0) return [];
		if (!(session instanceof Session)) throw new cError(401, 'Invalid session');

		const db = LimsPools[session.appUID];
		const s3 = s3Clients[session.appUID];
		if (!db) throw new cError(500, 'Database not found');
		if (!s3) throw new cError(500, 'S3 client not found');

		try {
			// Convert matching tags to the same format as stored in database
			const serializedMatchingTags = UniFile.#serializeTags(matchingTags);

			// If no valid tags to search for, return empty array
			if (serializedMatchingTags === null) {
				return [];
			}

			const query = {
				text: `SELECT * FROM "File" WHERE "systemTags" @> $1::text[] AND "deletedAt" IS NULL ORDER BY "createdAt" DESC`,
				values: [serializedMatchingTags],
			};

			const { rows: fileRecords } = await db.query(query.text, query.values);

			const uniFiles = [];
			for (const fileRecord of fileRecords) {
				try {
					const uniFile = new UniFile(fileRecord, session);
					const exists = await s3.statObject(uniFile.bucketName, uniFile.objectName);
					if (exists) {
						uniFiles.push(uniFile);
					}
				} catch (error) {
					handleError(error, `Skipping file ${fileRecord.id}`);
				}
			}

			return uniFiles;
		} catch (error) {
			handleError(error, 'UniFile.findSystemTags');
			return [];
		}
	}

	static #convertTags(tags) {
		if (!Array.isArray(tags)) return [];
		return tags.map((tag) => {
			if (typeof tag !== 'string' || !tag) return tag;
			const match = tag.match(/^([^:]+):(.+)$/);
			if (!match) return tag;
			const [, key, value] = match;
			if (!key) return tag;
			try {
				return { [key]: value.match(/^{.+}$|^[.+]$/) ? JSON.parse(value) : value };
			} catch {
				return { [key]: value };
			}
		});
	}

	static #serializeTags(tags) {
		// convert tags object array to string
		if (!Array.isArray(tags)) return null;
		if (tags.length === 0) return null;
		return tags.map((tag) => {
			if (typeof tag === 'string') return tag;
			if (typeof tag === 'object' && tag !== null) {
				const [key] = Object.keys(tag);
				const value = tag[key];
				if (key) {
					return `${key}:${typeof value === 'string' ? value : JSON.stringify(value)}`;
				}
			}
			return String(tag);
		});
	}
}

const entities = global.get('entities.js');
entities.UniFile = UniFile;

node.status({ fill: 'green', text: 'OK. Max size: 250MB', shape: 'ring' });
return msg;
