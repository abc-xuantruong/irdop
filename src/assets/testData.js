const { cError, handleError } = global.get('utilities.js');
    const { createCache } = global.get('cache.js');
    const { Entity } = global.get('entities.js');
    const { v4: uuidv4 } = global.get('uuid');

    // -- CACHE --
    const DocumentCache = createCache('document', 10 * 60 * 1000); // 10 minutes


    class DocCopy extends Entity {
        constructor(info, session) {
            super(info, session);
        }

        get appUID() { return this.session?.appUID; }
        get identityUID() { return this.session?.identityUID; }
        get db() { return this.session?.documentDB; }

        get id() { return this.info.id; }
        get copyId() { return this.info.id; }
        get metadata() { return this.info.metadata; }
        get classifierCode() { return this.info.classifierCode; }
        get logs() { return this.info.logs || []; }
        get fileId() { return this.info.fileId; }
        get mimeType() { return this.info.mimeType; }
        get startPage() { return this.info.startPage; }
        get endPage() { return this.info.endPage; }
        get totalPages() { return this.info.totalPages; }
        get foreignKeyUIDs() { return this.info.foreignKeyUIDs; }

        static async getCopy(id, session) {         // TRẢ VỀ DocCopy instance
            try {
                const db = session?.documentDB;	// permission check
                if (!db) throw new cError(401, `Please login to the app to get document`);

                const cacheKey = `DocCopy:${id}`;
                const cachedCopy = DocumentCache.get(cacheKey);
                if (cachedCopy) return new DocCopy(cachedCopy, session);

                // COPY QUERY
                const copyQuery = {
                    text: `SELECT * FROM document."copy" WHERE "id" = $1`,
                    params: [id]
                };
                const { rows: [copyRecord] } = await db.query(copyQuery.text, copyQuery.params);
                if (!copyRecord) throw new cError(404, `Copy ${id} not found`);
                DocumentCache.set(cacheKey, copyRecord);

                // LOG QUERY (if any)
                const logQuery = {
                    text: `SELECT * FROM document."log" WHERE "sourceTable" = 'document.copy' AND "sourceIds" = $1 LIMIT 10`,
                    params: [id]
                };
                const { rows: logRecords } = await db.query(logQuery.text, logQuery.params);

                // COMBINE RECORDS - CACHE - RETURN
                copyRecord.logs = logRecords;
                DocumentCache.set(cacheKey, copyRecord);

                return new DocCopy(copyRecord, session);
            } catch (error) {
                handleError(error, 'Document.getCopy');
                throw error;
            }
        }

        static async newCopies({ copyRecords, session, intent = 'Creating new copies' }) {      // TRẢ VỀ [DocCopy] instance
            const db = session?.documentDB;
            if (!db) throw new cError(401, `Please login to the app to record a new copy`);
            try {
                if (!Array.isArray(copyRecords)) copyRecords = [copyRecords];
                if (copyRecords.length === 0) throw new cError(400, 'copyRecords must be an array');

                // PREPARE RECORD
                for (const copyRecord of copyRecords) {
                    copyRecord.id = copyRecord.id || `COPYx${uuidv4().replace(/-/g, '').slice(0, 9)}`;
                    copyRecord.appUID = session.appUID;
                    copyRecord.identityUID = session.identityUID;
                    copyRecord.metadata = typeof copyRecord.metadata === 'string' ? copyRecord.metadata : JSON.stringify(copyRecord.metadata || {});
                    copyRecord.foreignKeyUIDs = copyRecord.foreignKeyUIDs;
                }

                // INSERT QUERY
                await db.query('BEGIN');
                await db.query(`SET app.intent = '${intent}'`);
                const newCopies = [];
                for (const copyRecord of copyRecords) {
                    const { quotedColumns, values } = await db.getColumnsAndValues('document.copy', copyRecord);
                    const query = {
                        text: `INSERT INTO document."copy" (${quotedColumns}) VALUES (${values.map((_, i) => `$${i + 1}`).join(',')}) RETURNING *`,
                        params: values,
                    }

                    const { rows: [newRecord] } = await db.query(query.text, query.params);
                    if (!newRecord) throw new cError(500, `Failed to create ${JSON.stringify(copyRecord)} copy`);
                    newCopies.push(newRecord);
                }

                await db.query('COMMIT');

                // Cache and return the new copies
                newCopies.forEach(copy => DocumentCache.set(`DocCopy:${copy.id}`, copy));
                return newCopies.map(copy => new DocCopy(copy, session));
            } catch (error) {
                await db.query('ROLLBACK').catch(() => { });
                handleError(error, 'Document.newCopies');
                throw error;
            }
        }

        static async updateCopies(copyRecords, session, intent = 'Updating copies') {           // TRẢ VỀ [DocCopy] instance
            const db = session?.documentDB;
            if (!db) throw new cError(401, `Please login to the app to update copy`);
            try {
                copyRecords = Array.isArray(copyRecords) ? copyRecords : [copyRecords];
                if (copyRecords.length === 0) throw new cError(400, 'copyRecords must be a non-empty array');
                if (copyRecords.some(r => !r.id)) throw new cError(400, 'copyRecord.id is required');

                await db.query('BEGIN');
                await db.query(`SET app.intent = '${intent}'`);

                // UPDATE QUERY (BATCH)
                const updatedCopies = await Promise.all(
                    copyRecords.map(async (copyRecord) => {
                        const { quotedColumns, values } = await db.getColumnsAndValues('document.copy', copyRecord);
                        const setClause = quotedColumns
                            .split(',')
                            .map((col, i) => `${col.trim()} = $${i + 1}`)
                            .join(', ');

                        const { rows: [updatedRecord] } = await db.query(
                            `UPDATE document."copy" SET ${setClause} WHERE "id" = $${values.length + 1}`,
                            [...values, copyRecord.id]
                        );

                        if (!updatedRecord) {
                            throw new cError(500, `Failed to update copy ${copyRecord.id}`);
                        }

                        return updatedRecord;
                    })
                );

                await db.query('COMMIT');

                // Update Cache & return
                updatedCopies.forEach(copy => DocumentCache.set(`DocCopy:${copy.id}`, copy));
                return updatedCopies.map(copy => new DocCopy(copy, session));
            } catch (error) {
                await db.query('ROLLBACK').catch(() => { });
                handleError(error, 'Document.updateDocCopy');
                throw error;
            }
        }

        static async downlinkCopy({ copyId, session, expiry = 60 * 60 * 24, mode = 'view' }) {    // TRẢ VỀ "URL"
            const { UniFile } = global.get('entities.js');
            if (!UniFile) throw new cError(500, 'UniFile is not available in global entities');

            try {
                const db = session?.documentDB;
                if (!db) throw new cError(401, `Please login to the app to download file`);

                // VALIDATE PARAMETERS
                if (!copyId) throw new cError(400, 'copyId is required');
                if (mode !== 'full' && mode !== 'partial') throw new cError(400, 'mode must be either "full" or "partial"');

                // GET DOC COPY
                const copy = await this.getCopy(copyId);
                if (!copy) throw new cError(404, `DocCopy ${copyId} not found`);
                if (!copy?.fileId) throw new cError(404, 'No file associated with this docCopy');

                // GET FILE
                const uniFile = await UniFile.getFile(copy.fileId, session);
                if (!uniFile) throw new cError(404, `File ${copy.fileId} not found`);

                return await uniFile.downlink(expiry, mode);
            } catch (error) {
                handleError(error, 'Document.downlinkDocCopy');
                throw error;
            }
        }

        static async getCopiesByPage(
            { searchTerm = "", page = 1, itemsPerPage = 15, mode = 'personal' },
            session
        ) {
            try {
                const db = session?.documentDB;
                if (!db) throw new cError(401, `Please login to the app to get copies`);
                if (!Number.isInteger(page) || page < 1) throw new cError(400, 'page must be a positive integer');
                if (!Number.isInteger(itemsPerPage) || itemsPerPage < 1) throw new cError(400, 'itemsPerPage must be a positive integer');

                const identityUID = session.identityUID;
                const offset = (page - 1) ;
                const filters = [];
                const params = [];

                // mode filter
                if (mode === 'personal') {
                    params.push(identityUID);
                    filters.push(`"identityUID" = $${params.length}`);
                }
                // mode === 'all' thì bỏ qua filter identityUID

                // searchTerm filters (ít nhất một điều kiện thỏa mãn)
                const term = searchTerm.trim();
                if (term !== '') {
                    const likeParam = `%${term}%`;
                    const searchFilters = [];

                    // metadata->'header'->>'title' ILIKE searchTerm
                    params.push(likeParam);
                    searchFilters.push(`metadata->'header'->>'title' ILIKE $${params.length}`);

                    // id ILIKE searchTerm
                    params.push(likeParam);
                    searchFilters.push(`"id" ILIKE $${params.length}`);

                    // metadata->'sampleUIDs' (mảng) có ít nhất một phần tử chứa searchTerm
                    params.push(likeParam);
                    searchFilters.push(`EXISTS (
                SELECT 1
                FROM jsonb_array_elements_text(metadata->'sampleUIDs') elem
                WHERE elem ILIKE $${params.length}
            )`);

                    // Thêm nhóm điều kiện search với OR
                    filters.push(`(${searchFilters.join(' OR ')})`);
                }

                const whereClause = filters.length ? 'WHERE ' + filters.join(' AND ') : '';

                // Query 1: Đếm tổng số bản ghi
                const countQuery = {
                    text: `SELECT COUNT(*) AS total FROM document."copy" ${whereClause}`,
                    params
                };
                const countResult = await db.query(countQuery.text, countQuery.params);
                const totalItems = parseInt(countResult.rows[0].total, 10);
                const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));

                // Query 2: Lấy danh sách bản ghi theo trang
                const limitIdx = params.length + 1;
                const offsetIdx = params.length + 2;
                const selectQuery = {
                    text: `SELECT * FROM document."copy" ${whereClause}
                   ORDER BY "id" DESC
                   LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
                    params: [...params, itemsPerPage, offset]
                };
                const selectResult = await db.query(selectQuery.text, selectQuery.params);

                return {
                    result: selectResult.rows,
                    pagination: { totalItems, totalPages, currentPage: page, itemsPerPage }
                };
            } catch (error) {
                handleError(error, 'DocCopy.getCopiesByPage');
                throw error;
            }
        }

        static async splitPdf({ copies = [], file, session }) {         // TRẢ VỀ Array of { ... copy, splitedFilePath, totalPages } 
            const { localDir } = global.get('utilities.js');
            const { PDFDocument } = global.get('pdf-lib');
            const fs = global.get('fs');
            const fsPromises = fs.promises;
            const { UniFile } = global.get('entities.js');

            // Validate dependencies
            if (!copies || copies.length === 0) throw new cError(400, 'copies is required');
            if (!UniFile) throw new cError(500, 'UniFile is not available in global entities');
            if (!PDFDocument) throw new cError(500, 'PDFDocument is not available in global pdf-lib');
            if (!fs) throw new cError(500, 'fs is not available in global fs');
            if (!file) throw new cError(400, 'file (string or UniFile object) is required');
            if (!session) throw new cError(401, 'session is required');

            try {
                // DOWNLOAD TO LOCAL TEMPORARY FOLDER
                let localPath;
                if (typeof file === 'string' && file.startsWith(localDir())) {
                    localPath = file;
                } else if (typeof file === 'string' && UniFile.checkFileId(file)) {
                    const uniFile = await UniFile.getFile(file, session);
                    if (!uniFile) throw new cError(404, `File ${file} not found`);
                    localPath = await uniFile.download();
                } else if (typeof file === 'object' && file instanceof UniFile) {
                    localPath = await file.download();
                } else if (typeof file === 'object' && file.localPath) {
                    localPath = file.localPath;
                }
                else throw new cError(400, 'File input must be a string (local path or fileId) or UniFile object');

                //  CHECK DOWNLOADED SUCCESSFULLY
                if (!localPath) throw new cError(400, 'Failed to have pdf file in local temporary folder');
                if (!localPath.toLowerCase().endsWith('.pdf')) throw new cError(400, `File ${localPath} is not a pdf`);
                await fsPromises.access(localPath, fs.constants.F_OK);

                // READ THE PDF FILE
                const pdfBytes = await fsPromises.readFile(localPath);
                const sourcePdf = await PDFDocument.load(pdfBytes);

                // VALIDATE PAGE RANGES OF ALL COPIES
                for (const copy of copies) {
                    const { startPage, endPage } = copy;

                    // Validate page range (0-based input)
                    if (!Number.isInteger(startPage) || !Number.isInteger(endPage) ||
                        startPage < 0 || endPage < startPage ||
                        endPage >= sourcePdf.getPageCount()) {
                        throw new Error(`Invalid page range for copy: ${startPage}-${endPage}`);
                    }
                }

                // SPLIT THE PDF FILE INTO MULTIPLE COPIES
                for (const copy of copies) {
                    const { startPage, endPage } = copy;

                    // CREATE A NEW BLANK PDF DOCUMENT FOR THIS SPLIT
                    const newPdf = await PDFDocument.create();

                    // Loop through the pages to be copied (0-based indexing)
                    for (let i = startPage; i <= endPage; i++) {
                        const sourcePage = sourcePdf.getPages()[i];
                        const embeddedPage = await newPdf.embedPage(sourcePage);
                        const newPage = newPdf.addPage();
                        newPage.drawPage(embeddedPage, {
                            x: 0,
                            y: 0,
                            width: newPage.getWidth(),
                            height: newPage.getHeight(),
                        });
                    }

                    // SAVE THE NEW PDF TO BYTES
                    const splitedPdfBytes = await newPdf.save();

                    // SAVE TO THE SAME FOLDER AS THE ORIGINAL FILE
                    const splitedFilePath = localPath.replace('.pdf', `_${startPage}-${endPage}.pdf`);
                    await fsPromises.writeFile(splitedFilePath, splitedPdfBytes);

                    // UPDATE COPY RECORD
                    copy.splitedFilePath = splitedFilePath;
                    copy.totalPages = endPage - startPage + 1;
                    copy.startPage = 0;
                    copy.endPage = null;
                }

                return copies;
            } catch (error) {
                handleError(error, 'Document.splitPdf');
                throw error;
            }
        }
    }

    class Edit extends Entity {
        constructor(info, session) {
            super(info, session);
            this.className = 'Edit';
        }

        get id() { return this.info.id; }
        get lockedByUID() { return this.info.lockedByUID; }
        get metadata() { return this.info.metadata; }
        get modifiedAt() { return this.info.modifiedAt; }
        get modifiedByUID() { return this.info.modifiedByUID; }
        get createdAt() { return this.info.createdAt; }
        get identityUID() { return this.info.identityUID; }


        get documentId() { return this.info.documentId; }
        get userId() { return this.info.userId; }
        get changes() { return this.info.changes; }

        async deleteEdit() {
            try {
                const db = this.session?.documentDB;
                if (!db) throw new cError(401, `Please login to the app to delete edit record`);

                const query = {
                    text: `DELETE FROM document."edit" WHERE "id" = $1`,
                    params: [this.id]
                };

                await db.query(query.text, query.params);
            } catch (error) {
                handleError(error, 'Edit.deleteEdit');
                throw error;
            }
        }

        static async autoSave({ editRecord }, session) {
            try {
                const db = session?.documentDB;
                if (!db) throw new cError(401, `Please login to the app to auto-save changes`);

                if (!editRecord.id) {
                    const uuid = uuidv4().replace(/-/g, '').slice(0, 8);
                    editRecord.id = 'edit_' + uuid;
                }

                editRecord.modifiedAt = new Date().toISOString();
                editRecord.appUID = session.appUID;
                editRecord.identityUID = session.appUID;
                editRecord.modifiedByUID = session.identityUID;

                // insert or update edit record
                const { quotedColumns, values } = await db.getColumnsAndValues('document.edit', editRecord);
                const columnList = quotedColumns.split(',').map(col => col.trim());
                // Only update columns that are not null/undefined in the new record 
                const updateSet = columnList
                    .filter((column, index) => values[index] != null)
                    .map(column => `${column} = EXCLUDED.${column}`)
                    .join(', ');

                const query = {
                    text: `INSERT INTO document."edit" (${quotedColumns}) VALUES (${values.map((_, i) => `$${i + 1}`).join(',')})
    					   ON CONFLICT ("id") DO UPDATE SET ${updateSet}
    					   RETURNING *`,
                    params: values,
                    intent: 'Auto-saving changes'
                };                

                const result = await db.query(query.text, query.params);
                return result.rows[0];
            } catch (error) {
                handleError(error, 'Edit.autoSave');
                throw error;
            }
        }

        static async getEdit(editId, session) {
            try {
                const db = session?.documentDB;
                if (!db) throw new cError(401, `Please login to the app to get edit record`);

                const query = {
                    text: `SELECT * FROM document."edit" WHERE "id" = $1`,
                    params: [editId]
                };

                const result = await db.query(query.text, query.params);
                if (result.rows.length === 0) throw new cError(404, `Edit record ${editId} not found`);

                return new Edit(result.rows[0], session);
            } catch (error) {
                handleError(error, 'Edit.getEdit');
                throw error;
            }
        }

        static async getEditsByPage(
            { searchTerm = "", page = 1, itemsPerPage = 15, mode = 'personal', status = 'draft' },
            session
        ) {
            try {
                const db = session?.documentDB;
                if (!db) throw new cError(401, `Please login to the app to get edits`);
                if (!Number.isInteger(page) || page < 1) throw new cError(400, 'page must be a positive integer');
                if (!Number.isInteger(itemsPerPage) || itemsPerPage < 1) throw new cError(400, 'itemsPerPage must be a positive integer');

                const identityUID = session.identityUID;
                const offset = (page - 1);
                const filters = [];
                const params = [];

                // mode filter
                if (mode === 'personal') {
                    params.push(identityUID);
                    filters.push(`"identityUID" = $${params.length}`);
                }
                // mode === 'all' thì bỏ qua filter identityUID

                // status filter: draft = null hoặc rỗng, others = có giá trị
                if (status === 'draft') {
                    filters.push(`("lockedByUID" IS NULL OR "lockedByUID" = '')`);
                } else {
                    filters.push(`("lockedByUID" IS NOT NULL AND "lockedByUID" <> '')`);
                }

                // searchTerm filters (ít nhất một điều kiện thỏa mãn)
                const term = searchTerm.trim();
                if (term !== '') {
                    const likeParam = `%${term}%`;
                    const searchFilters = [];

                    // metadata->>'header'->>'title' ILIKE searchTerm
                    params.push(likeParam);
                    searchFilters.push(`metadata->'header'->>'title' ILIKE $${params.length}`);

                    // id ILIKE searchTerm
                    params.push(likeParam);
                    searchFilters.push(`"id" ILIKE $${params.length}`);

                    // metadata->>'documentFingerprint' ILIKE searchTerm
                    params.push(likeParam);
                    searchFilters.push(`metadata->>'documentFingerprint' ILIKE $${params.length}`);

                    // metadata->>'sampleUIDs' (mảng) có ít nhất một phần tử chứa searchTerm
                    params.push(likeParam);
                    searchFilters.push(`EXISTS (
                SELECT 1
                FROM jsonb_array_elements_text(metadata->'sampleUIDs') elem
                WHERE elem ILIKE $${params.length}
            )`);

                    // Thêm nhóm điều kiện search với OR
                    filters.push(`(${searchFilters.join(' OR ')})`);
                }

                const whereClause = filters.length ? 'WHERE ' + filters.join(' AND ') : '';

                // Query 1: Đếm tổng số bản ghi
                const countQuery = {
                    text: `SELECT COUNT(*) AS total FROM document."edit" ${whereClause}`,
                    params
                };
                const countResult = await db.query(countQuery.text, countQuery.params);
                const totalItems = parseInt(countResult.rows[0].total, 10);
                const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));

                // Query 2: Lấy danh sách bản ghi theo trang
                const limitIdx = params.length + 1;
                const offsetIdx = params.length + 2;
                const selectQuery = {
                    text: `SELECT * FROM document."edit" ${whereClause}
                   ORDER BY "modifiedAt" DESC
                   LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
                    params: [...params, itemsPerPage, offset]
                };
                const selectResult = await db.query(selectQuery.text, selectQuery.params);

                return {
                    result: selectResult.rows,
                    pagination: { totalItems, totalPages, currentPage: page, itemsPerPage }
                };
            } catch (error) {
                handleError(error, 'Edit.getEditsByPage');
                throw error;
            }
        }

    }

    const entities = global.get('entities.js');
    entities.DocCopy = DocCopy;
    entities.Edit = Edit;

    node.status({ fill: 'green', shape: 'ring', text: 'OK' });
    return msg;