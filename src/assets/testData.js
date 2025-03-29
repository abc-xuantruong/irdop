const { Pool } = global.get('pg');
let pool;
// CONNECTING TO LAB DB
async function connect() {
	try {
		pool = new Pool(JSON.parse(env.get('labDB')));

		if (await testConnection()) {
			node.warn('[ INFO ] LAB DB pool already connected');
		} else {
			await pool.connect();
			node.warn('[ SUCCESS ] LAB DB pool connected');
		}
		global.set('labRepoClient', pool);
	} catch (error) {
		node.warn(`[ LAB REPO ERROR ] LABDB connection failed: ${error.stack}`);
		node.warn(error.stack);
	}
}

async function testConnection() {
	try {
		const client = global.get('labRepoClient');
		const result = await client.query('SELECT 1');
		return true; // return true if connected
	} catch (error) {
		return false;
	}
}

async function disconnect() {
	const client = global.get('labRepoClient');
	await client.end();
	global.set('labRepoClient', undefined);
	node.warn('[ INFO ] LAB DB disconnected');
}

await connect();

const repoClient = global.get('labRepoClient');

/** CREATE */

// Create Report
async function createReport(report) {
	const generateReportUID = () => {
		let splitSampleUid = report.sample_uid.split('-'); // "SPxYYQMDDTT"
		let date = splitSampleUid[0].slice(2); // "xYYQMDDTT" "XX"
		const currentDate = new Date(Date.now() + 7 * 60 * 60 * 1000); // GMT +7
		const year = currentDate.getFullYear().toString().slice(-1); // last current year's char
		const month = (currentDate.getMonth() + 1).toString(16).toUpperCase(); // convert hex (months are 0-indexed)
		const day = currentDate.getDate().toString(32); // convert base32 (use getDate() not getDay())
		const secondsSinceMidnight =
			currentDate.getHours() * 3600 + currentDate.getMinutes() * 60 + currentDate.getSeconds(); // get Seconds
		let encodeSeconds = Math.floor(secondsSinceMidnight / 2.7)
			.toString(32)
			.padStart(3, '0')
			.toUpperCase(); // 86400/2.7 = 32000 -> 3 chars base 32
		let result = `PPT${date}${splitSampleUid[1]}-${day}${year}${month}${encodeSeconds}`; // 'PPT' + 'xYYQMDDTT' + 'XX'  + '-' + DYMSSS
		return result;
	};

	try {
		report.ppt_uid = generateReportUID();

		// Remove timestamp fields - let PostgreSQL handle them
		delete report.created_at;
		delete report.modified_at;

		const validColumns = await matchValidColumns('report', Object.keys(report));
		if (validColumns.length === 0) {
			throw new Error(`Invalid report columns: ${Object.keys(report).join(', ')}`);
		}

		// replace report.header_section : '-- NH&Aacute;P / DRAFT --' -> report.ppt_uid
		report.header_section = report.header_section.replace('-- SƠ BỘ / DRAFT --', report.ppt_uid);

		report.reference = JSON.stringify(report.reference);

		const query = `INSERT INTO report (${validColumns.join(',')}, created_at, modified_at) 
			VALUES (${validColumns.map((_, index) => `$${index + 1}`).join(',')}, NOW(), NOW())
			RETURNING *`;

		const params = validColumns.map((column) => report[column]);
		const result = await repoClient.query(query, params);

		return result.rows[0];
	} catch (error) {
		const enhancedError = new Error(`Failed to create report: ${error.message}`);
		enhancedError.statusCode = 500;
		enhancedError.originalError = error;
		throw enhancedError;
	}
}

async function upsertDraftReport(report) {
    try {
        // Generate draft ppt_uid
        let splitSampleUid = report.sample_uid.split("-"); // "SPxYYQMDDTT"
        let date = splitSampleUid[0].slice(2); // "xYYQMDDTT" "XX"
        report.ppt_uid = `PPT${date}${splitSampleUid[1]}-DRAFT`;

        // Remove timestamp fields - let PostgreSQL handle them
        delete report.created_at;
        delete report.modified_at;

        const validColumns = await matchValidColumns(
            "report",
            Object.keys(report),
        );
        if (validColumns.length === 0) {
            throw new Error(
                `Invalid report columns: ${Object.keys(report).join(", ")}`,
            );
        }

        // replace report.header_section : '-- NH&Aacute;P / DRAFT --' -> report.ppt_uid
        report.header_section = report.header_section.replace(
            "-- SƠ BỘ / DRAFT --",
            report.ppt_uid,
        );

        report.reference = JSON.stringify(report.reference);

        // Check if report with this ppt_uid already exists
        const checkQuery = "SELECT id FROM report WHERE ppt_uid = $1";
        const checkResult = await repoClient.query(checkQuery, [
            report.ppt_uid,
        ]);

        let result;

        if (checkResult.rows.length > 0) {
            // Update existing report
            const reportId = checkResult.rows[0].id;

            const query = `UPDATE report SET 
                ${validColumns
                    .map((column, index) => `${column} = $${index + 2}`)
                    .join(", ")}, 
                modified_at = NOW() 
                WHERE id = $1 
                RETURNING *`;

            const params = [
                reportId,
                ...validColumns.map((column) => report[column]),
            ];
            result = await repoClient.query(query, params);
        } else {
            // Insert new report
            const query = `INSERT INTO report (${validColumns.join(
                ",",
            )}, created_at, modified_at) 
                VALUES (${validColumns
                    .map((_, index) => `$${index + 1}`)
                    .join(",")}, NOW(), NOW())
                RETURNING *`;

            const params = validColumns.map((column) => report[column]);
            result = await repoClient.query(query, params);
        }

        return result.rows[0];
    } catch (error) {
        const enhancedError = new Error(
            `Failed to upsert draft report: ${error.message}`,
        );
        enhancedError.statusCode = 500;
        enhancedError.originalError = error;
        throw enhancedError;
    }
}


// Create protocol
async function createProtocol(protocol) {
	try {
		// Remove timestamp fields - let PostgreSQL handle them
		delete protocol.created_at;
		delete protocol.modified_at;

		const validColumns = await matchValidColumns('protocol', Object.keys(protocol));
		if (validColumns.length === 0) {
			throw new Error(`Invalid protocol columns: ${Object.keys(protocol).join(', ')}`);
		}

		const query = `
			INSERT INTO protocol (${validColumns.join(',')}, created_at, modified_at) 
			VALUES (${validColumns.map((_, index) => `$${index + 1}`).join(',')}, NOW(), NOW())
			RETURNING *`;

		const params = validColumns.map((column) => protocol[column]);
		const result = await repoClient.query(query, params);

		return result.rows[0];
	} catch (error) {
		const enhancedError = new Error(`Failed to create protocol: ${error.message}`);
		enhancedError.statusCode = 500;
		enhancedError.originalError = error;
		throw enhancedError;
	}
}

// Create parameter
async function createParameter(parameter) {
	try {
		// Remove timestamp fields - let PostgreSQL handle them
		delete parameter.created_at;
		delete parameter.modified_at;

		const validColumns = await matchValidColumns('parameter', Object.keys(parameter));
		if (validColumns.length === 0) {
			throw new Error(`Invalid parameter columns: ${Object.keys(parameter).join(', ')}`);
		}

		const query = `
			INSERT INTO parameter (${validColumns.join(',')}, created_at, modified_at) 
			VALUES (${validColumns.map((_, index) => `$${index + 1}`).join(',')}, NOW(), NOW())
			RETURNING *`;

		const params = validColumns.map((column) => parameter[column]);
		const result = await repoClient.query(query, params);

		return result.rows[0];
	} catch (error) {
		const enhancedError = new Error(`Failed to create parameter: ${error.message}`);
		enhancedError.statusCode = 500;
		enhancedError.originalError = error;
		throw enhancedError;
	}
}

// Create bulk parameters
async function createBulkParameters(parameters) {
	try {
		if (!Array.isArray(parameters) || parameters.length === 0) {
			throw new Error('Parameters must be a non-empty array');
		}

		// Remove timestamp fields from each parameter
		parameters = parameters.map((param) => {
			const newParam = { ...param };
			delete newParam.created_at;
			delete newParam.modified_at;
			return newParam;
		});

		const validColumns = await matchValidColumns('parameter', Object.keys(parameters[0]));
		if (validColumns.length === 0) {
			throw new Error(`Invalid parameter columns: ${Object.keys(parameters[0]).join(', ')}`);
		}

		const query = `
			INSERT INTO parameter (${validColumns.join(',')}, created_at, modified_at) 
			VALUES ${parameters
				.map((_, i) => `(${validColumns.map((_, j) => `$${i * validColumns.length + j + 1}`).join(',')}, NOW(), NOW())`)
				.join(',')}
			RETURNING *`;

		const params = parameters.flatMap((parameter) => validColumns.map((column) => parameter[column]));
		const result = await repoClient.query(query, params);

		return result.rows;
	} catch (error) {
		const enhancedError = new Error(`Failed to create bulk parameters: ${error.message}`);
		enhancedError.statusCode = 500;
		enhancedError.originalError = error;
		throw enhancedError;
	}
}

//create client
async function createClient(client) {
	try {
		// Remove timestamp fields - let PostgreSQL handle them
		delete client.created_at;
		delete client.modified_at;

		const validColumns = await matchValidColumns('client', Object.keys(client));
		if (validColumns.length === 0) {
			throw new Error(`Invalid client columns: ${Object.keys(client).join(', ')}`);
		}

		client.contacts = JSON.stringify(client?.contacts || []);

		const query = `
			INSERT INTO client (${validColumns.join(',')}, created_at, modified_at) 
			VALUES (${validColumns.map((_, index) => `$${index + 1}`).join(',')}, NOW(), NOW())
			RETURNING *`;

		const params = validColumns.map((column) => client[column]);
		const result = await repoClient.query(query, params);

		return result.rows[0];
	} catch (error) {
		const enhancedError = new Error(`Failed to create client: ${error.message}`);
		enhancedError.statusCode = 500;
		enhancedError.originalError = error;
		throw enhancedError;
	}
}

// Create analysis
async function createAnalysis(analysis) {
	try {
		// Remove timestamp fields - let PostgreSQL handle them
		delete analysis.created_at;
		delete analysis.modified_at;

		const validColumns = await matchValidColumns('analysis', Object.keys(analysis));
		if (validColumns.length === 0) {
			throw new Error(`Invalid analysis columns: ${Object.keys(analysis).join(', ')}`);
		}

		const query = `
			INSERT INTO analysis (${validColumns.join(',')}, created_at, modified_at) 
			VALUES (${validColumns.map((_, index) => `$${index + 1}`).join(',')}, NOW(), NOW())
			RETURNING *`;

		const params = validColumns.map((column) => analysis[column]);
		const result = await repoClient.query(query, params);

		return result.rows[0];
	} catch (error) {
		const enhancedError = new Error(`Failed to create analysis: ${error.message}`);
		enhancedError.statusCode = 500;
		enhancedError.originalError = error;
		throw enhancedError;
	}
}

async function upsertParameterByUid(parameter) {
	try {
		// Remove timestamp fields - let PostgreSQL handle them
		delete parameter.created_at;
		delete parameter.modified_at;

		// Chỉ lấy các key hợp lệ
		const validColumns = ['parameter_uid', 'parameter_name', 'matrix', 'protocol_code', 'protocol_source'];
		const filteredParam = validColumns.reduce((acc, key) => {
			if (parameter[key] !== undefined) acc[key] = parameter[key];
			return acc;
		}, {});

		// Nếu không có dữ liệu hợp lệ, báo lỗi
		if (Object.keys(filteredParam).length === 0) {
			throw new Error('No valid columns provided for upsert.');
		}

		const query = `
			INSERT INTO parameter (${validColumns.join(',')}, created_at, modified_at) 
			VALUES (${validColumns.map((_, index) => `$${index + 1}`).join(',')}, NOW(), NOW())
			ON CONFLICT (parameter_uid) DO UPDATE 
			SET ${validColumns
				.slice(1)
				.map((col, index) => `${col} = $${index + validColumns.length + 1}`)
				.join(', ')}, modified_at = NOW()
			RETURNING *`;

		// Gộp giá trị cho INSERT và UPDATE
		const params = [
			...validColumns.map((col) => parameter[col]),
			...validColumns.slice(1).map((col) => parameter[col]),
		];

		// Thực hiện truy vấn
		const result = await repoClient.query(query, params);
		return result.rows[0];
	} catch (error) {
		const enhancedError = new Error(`Failed to upsert parameter: ${error.message}`);
		enhancedError.statusCode = 500;
		enhancedError.originalError = error;
		throw enhancedError;
	}
}

// Create bulk analysis from parameters
async function createBulkAnalysisFromParameters(analyses) {
	try {
		if (!Array.isArray(analyses) || analyses.length === 0) {
			throw new Error('Analyses must be a non-empty array');
		}

		// Remove timestamp fields from each analysis
		analyses = analyses.map((analysis) => {
			const newAnalysis = { ...analysis };
			delete newAnalysis.created_at;
			delete newAnalysis.modified_at;
			return newAnalysis;
		});

		const validColumns = await matchValidColumns('analysis', Object.keys(analyses[0]));
		if (validColumns.length === 0) {
			throw new Error(`Invalid analysis columns: ${Object.keys(analyses[0]).join(', ')}`);
		}

		const query = `
			INSERT INTO analysis (${validColumns.join(',')}, created_at, modified_at) 
			VALUES ${analyses
				.map((_, i) => `(${validColumns.map((_, j) => `$${i * validColumns.length + j + 1}`).join(',')}, NOW(), NOW())`)
				.join(',')}
			RETURNING *`;

		const params = analyses.flatMap((analysis) => validColumns.map((column) => analysis[column]));
		const result = await repoClient.query(query, params);

		return result.rows;
	} catch (error) {
		const enhancedError = new Error(`Failed to create bulk analyses: ${error.message}`);
		enhancedError.statusCode = 500;
		enhancedError.originalError = error;
		throw enhancedError;
	}
}

async function createReceipt(receipt) {
	try {
		// Remove timestamp fields - let PostgreSQL handle them
		delete receipt.created_at;
		delete receipt.modified_at;

		if (!receipt.receipt_date) {
			receipt.receipt_date = new Date();
		}

		// Generate baseUid
		const now = new Date();
		const year = now.getFullYear().toString().slice(-2);
		const quarter = Math.floor((now.getMonth() + 3) / 3);
		const monthInQuarter = (now.getMonth() % 3) + 1;
		const day = String(now.getDate()).padStart(2, '0');

		const baseUid = `TNM${year}${quarter}${monthInQuarter}x${day}`;

		// Query to get the maximum value of the last two characters
		const query = `
			SELECT MAX(SUBSTRING(receipt_uid FROM LENGTH(receipt_uid) - 1 FOR 2)) AS max_suffix
			FROM receipt
			WHERE receipt_uid LIKE '${baseUid}%';
		`;
		const result = await repoClient.query(query);
		let maxSuffix = result.rows[0].max_suffix;

		// Determine the new suffix
		let newSuffix;
		if (maxSuffix) {
			newSuffix = String(parseInt(maxSuffix, 10) + 1).padStart(2, '0');
		} else {
			newSuffix = '01';
		}

		// Create the new receipt_uid
		receipt.receipt_uid = `${baseUid}${newSuffix}`;

		// Validate columns
		const validColumns = await matchValidColumns('receipt', Object.keys(receipt));
		if (validColumns.length === 0) {
			throw new Error(`Invalid receipt columns: ${Object.keys(receipt).join(', ')}`);
		}

		// Insert the new receipt with timestamps
		const insertQuery = `
			INSERT INTO receipt (${validColumns.join(',')}, created_at, modified_at) 
			VALUES (${validColumns.map((_, index) => `$${index + 1}`).join(',')}, NOW(), NOW())
			RETURNING *;
		`;

		const params = validColumns.map((column) => receipt[column]);
		const insertResult = await repoClient.query(insertQuery, params);

		return insertResult.rows[0];
	} catch (error) {
		const enhancedError = new Error(`Failed to create receipt: ${error.message}`);
		enhancedError.statusCode = 500;
		enhancedError.originalError = error;
		throw enhancedError;
	}
}

async function createSample(sample) {
	try {
// 		// Remove timestamp fields - let PostgreSQL handle them
		delete sample.created_at;
		delete sample.modified_at;

		// Get the receipt for the sample
		const receiptQuery = 'SELECT receipt_uid FROM receipt WHERE id = $1';
		const receiptResult = await repoClient.query(receiptQuery, [sample.receipt_id]);
		const receiptUid = receiptResult.rows[0].receipt_uid;

		// Extract the base UID from the receipt UID
		const baseUid = receiptUid.slice(3); // Remove 'TNM' prefix

		// Get the highest sample UID for the same receipt
		const sampleQuery = `
			SELECT MAX(SUBSTRING(sample_uid FROM LENGTH(sample_uid) - 1 FOR 2)) AS max_uid
			FROM sample
			WHERE receipt_id = $1;
		`;
		const sampleResult = await repoClient.query(sampleQuery, [sample.receipt_id]);
		const maxUid = sampleResult.rows[0].max_uid;
		const newUidSuffix = maxUid ? String(parseInt(maxUid) + 1).padStart(2, '0') : '01';

		// Generate the new sample UID
		sample.sample_uid = `SP${baseUid}-${newUidSuffix}`;

		// Add default sample_information if not provided
        if (!sample.sample_information) {
            sample.sample_information = JSON.stringify([
                { fname: 'Tên mẫu thử / name.', fvalue: sample?.sample_name || '' },
                { fname: 'Số lô / LOT no.', fvalue: '' },
                { fname: 'Ngày SX / mfg.', fvalue: '' },
                { fname: 'HSD / exp.', fvalue: '' },
                { fname: 'Nơi SX / mfr.', fvalue: '' },
                { 
                    fname: 'Ngày tiếp nhận / receipt date.', 
                    fvalue: new Date().toLocaleDateString('vi-VN') 
                },
                { fname: 'Mô tả / desc.', fvalue: sample?.sample_description || '' },
            ]);
        }

		const validColumns = await matchValidColumns('sample', Object.keys(sample));
		if (validColumns.length === 0) {
			throw new Error(`Invalid sample columns: ${Object.keys(sample).join(', ')}`);
		}

		const query = `
			INSERT INTO sample (${validColumns.join(',')}) 
			VALUES (${validColumns.map((_, index) => `$${index + 1}`).join(',')})
			RETURNING *`;

		const params = validColumns.map((column) => sample[column]);
		const result = await repoClient.query(query, params);

		return result.rows[0];
	} catch (error) {
		const enhancedError = new Error(`Failed to create sample: ${error.message}`);
		enhancedError.statusCode = 500;
		enhancedError.originalError = error;
		throw enhancedError;
	}
}

/** READ */
// Get report by sample UID (SELECT ppt_uid)
async function getPptUidBySampleUid({ id, sample_uid }) {
	try {
		if (!id && !sample_uid) throw new Error('Sample id or sample_uid must be not null!');
		const conditional = id ? 'WHERE id = $1' : 'WHERE sample_uid = $1';
		const param = id ? [id] : [sample_uid];
		const query = 'SELECT ppt_uid,created_at FROM report ' + conditional;

		const result = await repoClient.query(query, param);
		return result.rows.map((row) => {
		    const data ={ppt_uid: row.ppt_uid, publish_date:row.created_at}
		    return data;
		 });
	} catch (error) {
		const enhancedError = new Error(`Failed to get PPT UID: ${error.message}`);
		enhancedError.statusCode = 500;
		enhancedError.originalError = error;
		throw enhancedError;
	}
}

// Get report by PPT UID
async function getReport({ id, ppt_uid }) {
	try {
		if (!id && !ppt_uid) throw new Error('Report id or ppt_uid must be not null!');
		const conditional = id ? 'WHERE id = $1' : 'WHERE ppt_uid = $1';
		const param = id ? [id] : [ppt_uid];
		const query = 'SELECT * FROM report ' + conditional;
		const result = await repoClient.query(query, param);

		return result.rows[0];
	} catch (error) {
		const enhancedError = new Error(`Failed to get report: ${error.message}`);
		enhancedError.statusCode = 500;
		enhancedError.originalError = error;
		throw enhancedError;
	}
}

// Get protocol by ID
async function getProtocolById(id) {
	try {
		const query = 'SELECT * FROM protocol WHERE id = $1';
		const values = [id];
		const result = await repoClient.query(query, values);

		const protocol = result.rows[0];
		if (protocol) {
			const parameters = await getParametersByProtocolId(protocol.id);
			return { ...protocol, parameters };
		}
		return protocol;
	} catch (error) {
		const enhancedError = new Error(`Failed to get protocol with ID ${id}: ${error.message}`);
		enhancedError.statusCode = 500;
		enhancedError.originalError = error;
		throw enhancedError;
	}
}

// Get all protocols
async function getAllProtocols() {
	const client = await repoClient.connect();
	try {
		await client.query('BEGIN');
		const query = 'SELECT * FROM protocol ORDER BY id DESC';
		const result = await client.query(query);

		const protocols = result.rows;
		for (let protocol of protocols) {
			const parameters = await getParametersByProtocolId(protocol.id);
			protocol.parameters = parameters;
		}

		await client.query('COMMIT');
		return protocols;
	} catch (error) {
		await client.query('ROLLBACK');
		const enhancedError = new Error(`Failed to get all protocols: ${error.message}`);
		enhancedError.statusCode = 500;
		enhancedError.originalError = error;
		throw enhancedError;
	} finally {
		client.release();
	}
}

// Get parameter by ID
async function getParameter({ id, uid }) {
	try {
		if (!id && !uid) throw new Error('Parameter id or uid must be not null!');
		const conditional = id ? 'WHERE id = $1' : 'WHERE parameter_uid = $1';
		const param = id ? [id] : [uid];
		const query = 'SELECT * FROM parameter ' + conditional;

		const result = await repoClient.query(query, param);

		return result.rows[0];
	} catch (error) {
		const enhancedError = new Error(`Failed to get parameter: ${error.message}`);
		enhancedError.statusCode = 500;
		enhancedError.originalError = error;
		throw enhancedError;
	}
}

// Get bulk parameters by IDs or UIDs
async function getBulkParameter({ ids, uids }) {
	const client = await repoClient.connect();
	try {
		await client.query('BEGIN');
		let query, values;
		if (ids) {
			query = 'SELECT * FROM parameter WHERE id = ANY($1::int[])';
			values = [Array.isArray(ids) ? ids : [ids]];
		} else if (uids) {
			query = 'SELECT * FROM parameter WHERE parameter_uid = ANY($1::text[])';
			values = [Array.isArray(uids) ? uids : [uids]];
		} else {
			throw new Error('Either ids or uids must be provided');
		}
		const result = await client.query(query, values);
		await client.query('COMMIT');
		return result.rows;
	} catch (error) {
		await client.query('ROLLBACK');
		const enhancedError = new Error(`Failed to get bulk parameters: ${error.message}`);
		enhancedError.statusCode = 500;
		enhancedError.originalError = error;
		throw enhancedError;
	} finally {
		client.release();
	}
}

async function getAllParameters() {
	try {
		const query = 'SELECT * FROM parameter ORDER BY id DESC';
		const result = await repoClient.query(query);

		return result.rows;
	} catch (error) {
		const enhancedError = new Error(`Failed to get all parameters: ${error.message}`);
		enhancedError.statusCode = 500;
		enhancedError.originalError = error;
		throw enhancedError;
	}
}

// Get parameters by protocol ID
async function getParametersByProtocolId(protocol_id) {
	try {
		const query = 'SELECT * FROM parameter WHERE protocol_id = $1 ORDER BY id DESC';
		const values = [protocol_id];
		const result = await repoClient.query(query, values);

		return result.rows;
	} catch (error) {
		const enhancedError = new Error(`Failed to get parameters for protocol ID ${protocol_id}: ${error.message}`);
		enhancedError.statusCode = 500;
		enhancedError.originalError = error;
		throw enhancedError;
	}
}

async function getAllReceipt() {
	try {
		const query = 'SELECT * FROM receipt ORDER BY id DESC';
		const result = await repoClient.query(query);

		return result.rows;
	} catch (error) {
		const enhancedError = new Error(`Failed to get all receipts: ${error.message}`);
		enhancedError.statusCode = 500;
		enhancedError.originalError = error;
		throw enhancedError;
	}
}

async function getReceiptByDeadline({start,end}) {
	try {
		const query = 'SELECT * FROM receipt WHERE deadline BETWEEN $1 AND $2  ORDER BY id DESC';
		const values = [start, end];
		const result = await repoClient.query(query, values);

		return result.rows;
	} catch (error) {
		const enhancedError = new Error(`Failed to get all receipts: ${error.message}`);
		enhancedError.statusCode = 500;
		enhancedError.originalError = error;
		throw enhancedError;
	}
}

async function getReceipt({ id, receipt_uid }) {
	try {
		if (!id && !receipt_uid) throw new Error('Receipt id or uid must be not null!');
		const conditional = id ? 'WHERE id = $1' : 'WHERE receipt_uid = $1';
		const param = id ? [id] : [receipt_uid];
		const query = 'SELECT * FROM receipt ' + conditional;
		const result = await repoClient.query(query, param);

		return result.rows[0];
	} catch (error) {
		const enhancedError = new Error(`Failed to get receipt: ${error.message}`);
		enhancedError.statusCode = 500;
		enhancedError.originalError = error;
		throw enhancedError;
	}
}

async function getAllSample() {
	try {
		const query = 'SELECT * FROM sample ORDER BY id DESC';
		const result = await repoClient.query(query);

		return result.rows;
	} catch (error) {
		const enhancedError = new Error(`Failed to get all samples: ${error.message}`);
		enhancedError.statusCode = 500;
		enhancedError.originalError = error;
		throw enhancedError;
	}
}

async function getSample({ id, sample_uid }) {
	try {
		if (!id && !sample_uid) throw new Error('Sample id or uid must be not null!');
		const conditional = id ? 'WHERE id = $1' : 'WHERE sample_uid = $1';
		const param = id ? [id] : [sample_uid];
		const query = 'SELECT * FROM sample ' + conditional;
		const result = await repoClient.query(query, param);

		return result.rows[0];
	} catch (error) {
		const enhancedError = new Error(`Failed to get sample: ${error.message}`);
		enhancedError.statusCode = 500;
		enhancedError.originalError = error;
		throw enhancedError;
	}
}

async function getSampleByReceipt({ id, receipt_uid }) {
	try {
		if (!receipt_uid && !id) throw new Error('Receipt id or uid must be not null!');
		else if (!id && receipt_uid) {
			const query = 'SELECT * FROM receipt WHERE receipt_uid = $1';
			const result = await repoClient.query(query, [receipt_uid]);
			id = result.rows[0].id;
		}
        
		const query = 'SELECT * FROM sample WHERE receipt_id = $1 ORDER BY id DESC';
		const result = await repoClient.query(query, [id]);

		return result.rows;
	} catch (error) {
		const enhancedError = new Error(`Failed to get samples by receipt: ${error.message}`);
		enhancedError.statusCode = 500;
		enhancedError.originalError = error;
		throw enhancedError;
	}
}

async function getAllAnalysis() {
	try {
		const query = 'SELECT * FROM analysis ORDER BY id DESC';
		const result = await repoClient.query(query);

		return result.rows;
	} catch (error) {
		const enhancedError = new Error(`Failed to get all analyses: ${error.message}`);
		enhancedError.statusCode = 500;
		enhancedError.originalError = error;
		throw enhancedError;
	}
}

async function getAnalysis({ id }) {
	try {
		if (!id) throw new Error('Analysis id must be not null!');
		const query = 'SELECT * FROM analysis WHERE id = $1';
		const result = await repoClient.query(query, [id]);

		return result.rows[0];
	} catch (error) {
		const enhancedError = new Error(`Failed to get analysis with ID ${id}: ${error.message}`);
		enhancedError.statusCode = 500;
		enhancedError.originalError = error;
		throw enhancedError;
	}
}

async function getAnalysisBySample({ id, sample_uid }) {
	try {
		if (!sample_uid && !id) throw new Error('Sample id or uid must be not null!');
		else if (!id && sample_uid) {
			const query = 'SELECT * FROM sample WHERE sample_uid = $1 ORDER BY id DESC';
			const result = await repoClient.query(query, [sample_uid]);
			id = result.rows[0].id;
		}

		const query = 'SELECT * FROM analysis WHERE sample_id = $1 ORDER BY id ASC';
		const result = await repoClient.query(query, [id]);

		return result.rows;
	} catch (error) {
		const enhancedError = new Error(`Failed to get analyses by sample: ${error.message}`);
		enhancedError.statusCode = 500;
		enhancedError.originalError = error;
		throw enhancedError;
	}
}

async function getAnalysisByReceipt({ id, receipt_uid }) {
	try {
		if (!receipt_uid && !id) throw new Error('Receipt id or uid must be not null!');
		else if (!id && receipt_uid) {
			const query = 'SELECT * FROM receipt WHERE receipt_uid = $1';
			const result = await repoClient.query(query, [receipt_uid]);
			id = result.rows[0].id;
		}

		const query = 'SELECT * FROM analysis WHERE receipt_id = $1 ORDER BY id DESC';
		const result = await repoClient.query(query, [id]);

		return result.rows;
	} catch (error) {
		const enhancedError = new Error(`Failed to get analyses by receipt: ${error.message}`);
		enhancedError.statusCode = 500;
		enhancedError.originalError = error;
		throw enhancedError;
	}
}

async function getAllClient() {
	try {
		const query = 'SELECT * FROM client ORDER BY id DESC';
		const result = await repoClient.query(query);

		return result.rows;
	} catch (error) {
		const enhancedError = new Error(`Failed to get all clients: ${error.message}`);
		enhancedError.statusCode = 500;
		enhancedError.originalError = error;
		throw enhancedError;
	}
}

async function getClient({ id, client_uid }) {
	try {
		if (!id && !client_uid) throw new Error('Client id or uid must be not null!');
		const conditional = id ? 'WHERE id = $1' : 'WHERE client_uid = $1';
		const param = id ? [id] : [client_uid];
		const query = 'SELECT * FROM client ' + conditional;
		const result = await repoClient.query(query, param);

		return result.rows[0];
	} catch (error) {
		const enhancedError = new Error(`Failed to get client: ${error.message}`);
		enhancedError.statusCode = 500;
		enhancedError.originalError = error;
		throw enhancedError;
	}
}

async function getTemporaryClient() {
	try {
		const query = `
			SELECT client, contact, id
			FROM receipt
			WHERE client IS NOT NULL AND client_id IS NULL;
		`;
		const result = await repoClient.query(query);
		return result.rows.map((row) => ({ receipt_id: row.id, ...row.client, contacts: [row.contact] }));
	} catch (error) {
		const enhancedError = new Error(`Failed to get temporary client: ${error.message}`);
		enhancedError.statusCode = 500;
		enhancedError.originalError = error;
		throw enhancedError;
	}
}

async function getTemporaryContact() {
	try {
		const query = `
			SELECT client, contact , client_id , id
			FROM receipt
			WHERE client_id IS NOT NULL AND (contact IS NOT NULL AND contact->>'index' IS NULL);
		`;
		const result = await repoClient.query(query);
		return result.rows.map((row) => ({
			receipt_id: row.id,
			id: row.client_id,
			...row.client,
			contacts: [row.contact],
		}));
	} catch (error) {
		const enhancedError = new Error(`Failed to get temporary contact: ${error.message}`);
		enhancedError.statusCode = 500;
		enhancedError.originalError = error;
		throw enhancedError;
	}
}

async function getClientByReceipt({ id, receipt_uid }) {
	// get receipt => get receipt.client
	try {
		if (!receipt_uid && !id) throw new Error('Receipt id or uid must be not null!');
		else if (!id && receipt_uid) {
			const query = 'SELECT * FROM receipt WHERE receipt_uid = $1';
			const result = await repoClient.query(query, [receipt_uid]);
			return result.rows[0].client;
		} else {
			const query = 'SELECT * FROM receipt WHERE id = $1';
			const result = await repoClient.query(query, [id]);
			return result.rows[0].client;
		}
	} catch (error) {
		const enhancedError = new Error(`Failed to get client by receipt: ${error.message}`);
		enhancedError.statusCode = 500;
		enhancedError.originalError = error;
		throw enhancedError;
	}
}
/** UPDATE */
// Update protocol
async function updateProtocol(protocol) {
	try {
		if (typeof protocol === 'object' && protocol.id) {
			// Remove timestamp fields
			delete protocol.created_at;
			delete protocol.modified_at;

			const validColumns = await matchValidColumns('protocol', Object.keys(protocol));
			if (validColumns.length === 0) {
				throw new Error(`Invalid protocol columns: ${Object.keys(protocol).join(', ')}`);
			}

			// Include modified_at in the UPDATE statement directly
			const query = `UPDATE protocol SET ${validColumns
				.map((column, index) => `${column} = $${index + 2}`)
				.join(', ')}, modified_at = NOW() WHERE id = $1 RETURNING *`;
			const values = [protocol.id, ...validColumns.map((column) => protocol[column])];

			const result = await repoClient.query(query, values);

			return result.rows[0];
		} else {
			throw new Error('Invalid protocol');
		}
	} catch (error) {
		const enhancedError = new Error(`Failed to update protocol: ${error.message}`);
		enhancedError.statusCode = 500;
		enhancedError.originalError = error;
		throw enhancedError;
	}
}

// Update parameter
async function matchParameter(parameter) {
	try {
		const query = `
		SELECT *
		FROM parameter
		WHERE similarity(parameter_name, $1) > 0.8
			AND (
				similarity(matrix, $2) > 0.6
				OR $2 ILIKE '%' || matrix || '%'
			)
		ORDER BY similarity(parameter_name, $1) DESC, 
				 similarity(matrix, $2) DESC
		LIMIT 1;  
		`;

		const params = [parameter.parameter_name, parameter.matrix];
		const result = await repoClient.query(query, params);

		return result.rows[0] || null; // Tránh lỗi undefined khi không có kết quả
	} catch (error) {
		console.error("Database query error:", error); // Ghi log lỗi
		throw error; // Nên throw error thay vì chỉ console.warn
	}
}

async function updateParameter(parameter) {
	try {
		if (typeof parameter === 'object' && parameter.id) {
			// Remove timestamp fields
			delete parameter.created_at;
			delete parameter.modified_at;

			const validColumns = await matchValidColumns('parameter', Object.keys(parameter));
			if (validColumns.length === 0) {
				throw new Error(`Invalid parameter columns: ${Object.keys(parameter).join(', ')}`);
			}

			// Include modified_at in the UPDATE statement directly
			const query = `UPDATE parameter SET ${validColumns
				.map((column, index) => `${column} = $${index + 2}`)
				.join(', ')}, modified_at = NOW() WHERE id = $1 RETURNING *`;
			const values = [parameter.id, ...validColumns.map((column) => parameter[column])];

			const result = await repoClient.query(query, values);

			return result.rows[0];
		} else {
			throw new Error('Invalid parameter');
		}
	} catch (error) {
		const enhancedError = new Error(`Failed to update parameter: ${error.message}`);
		enhancedError.statusCode = 500;
		enhancedError.originalError = error;
		throw enhancedError;
	}
}

async function updateReceipt(receipt) {
	try {
		if (typeof receipt === 'object' && receipt.id) {
			// Remove timestamp fields
			delete receipt.created_at;
			delete receipt.modified_at;

			const validColumns = await matchValidColumns('receipt', Object.keys(receipt));
			if (validColumns.length === 0) {
				throw new Error(`Invalid receipt columns: ${Object.keys(receipt).join(', ')}`);
			}

			// Include modified_at in the UPDATE statement directly
			const query = `UPDATE receipt SET ${validColumns
				.map((column, index) => `${column} = $${index + 2}`)
				.join(', ')}, modified_at = NOW() WHERE id = $1 RETURNING *`;
			const values = [receipt.id, ...validColumns.map((column) => receipt[column])];

			const result = await repoClient.query(query, values);

			return result.rows[0];
		} else {
			throw new Error('Invalid receipt');
		}
	} catch (error) {
		const enhancedError = new Error(`Failed to update receipt: ${error.message}`);
		enhancedError.statusCode = 500;
		enhancedError.originalError = error;
		throw enhancedError;
	}
}

async function updateSample(sample) {
	try {
		if (typeof sample === 'object' && sample.id) {
			// Remove timestamp fields
			delete sample.created_at;
			delete sample.modified_at;

			const validColumns = await matchValidColumns('sample', Object.keys(sample));
			if (validColumns.length === 0) {
				throw new Error(`Invalid sample columns: ${Object.keys(sample).join(', ')}`);
			}
			if (sample?.sample_information) {
				sample.sample_information = JSON.stringify(sample.sample_information);
			}
			// Include modified_at in the UPDATE statement directly
			const query = `UPDATE sample SET ${validColumns
				.map((column, index) => `${column} = $${index + 2}`)
				.join(', ')}, modified_at = NOW() WHERE id = $1 RETURNING *`;
			const values = [sample.id, ...validColumns.map((column) => sample[column])];
			const result = await repoClient.query(query, values);

			return result.rows[0];
		} else {
			throw new Error('Invalid sample');
		}
	} catch (error) {
		const enhancedError = new Error(`Failed to update sample: ${error.message}`);
		enhancedError.statusCode = 500;
		enhancedError.originalError = error;
		throw enhancedError;
	}
}

async function updateAnalysis(analysis) {
	try {
		if (typeof analysis === 'object' && analysis.id) {
			// Remove timestamp fields
			delete analysis.created_at;
			delete analysis.modified_at;

			const validColumns = await matchValidColumns('analysis', Object.keys(analysis));
			if (validColumns.length === 0) {
				throw new Error(`Invalid analysis columns: ${Object.keys(analysis).join(', ')}`);
			}

			// Include modified_at in the UPDATE statement directly
			const query = `UPDATE analysis SET ${validColumns
				.map((column, index) => `${column} = $${index + 2}`)
				.join(', ')}, modified_at = NOW() WHERE id = $1 RETURNING *`;
			const values = [analysis.id, ...validColumns.map((column) => analysis[column])];

			const result = await repoClient.query(query, values);

			return result.rows[0];
		} else {
			throw new Error('Invalid analysis');
		}
	} catch (error) {
		const enhancedError = new Error(`Failed to update analysis: ${error.message}`);
		enhancedError.statusCode = 500;
		enhancedError.originalError = error;
		throw enhancedError;
	}
}

async function updateClient(client) {
	try {
		if (typeof client === 'object' && client.id) {
			// Remove timestamp fields
			delete client.created_at;
			delete client.modified_at;

			const validColumns = await matchValidColumns('client', Object.keys(client));
			if (validColumns.length === 0) {
				throw new Error(`Invalid client columns: ${Object.keys(client).join(', ')}`);
			}
			client.contacts = JSON.stringify(client.contacts || []);

			// Include modified_at in the UPDATE statement directly
			const query = `UPDATE client SET ${validColumns
				.map((column, index) => `${column} = $${index + 2}`)
				.join(', ')}, modified_at = NOW() WHERE id = $1 RETURNING *`;
			const values = [client.id, ...validColumns.map((column) => client[column])];

			const result = await repoClient.query(query, values);

			return result.rows[0];
		} else {
			throw new Error('Invalid client');
		}
	} catch (error) {
		const enhancedError = new Error(`Failed to update client: ${error.message}`);
		enhancedError.statusCode = 500;
		enhancedError.originalError = error;
		throw enhancedError;
	}
}

async function updateTemporaryClient(client) {
	try {
		if (typeof client !== 'object' || !client) {
			throw new Error('Invalid client');
		}

		// Remove timestamp fields
		delete client.created_at;
		delete client.modified_at;

		if (client.contacts && client.contacts === null) delete client.contact;

		if (client.contacts && Array.isArray(client.contacts)) {
			client.contacts = client.contacts.filter((contact) => contact !== null);
		}

		const validColumns = await matchValidColumns('client', Object.keys(client));
		if (validColumns.length === 0) {
			throw new Error(`Invalid client columns: ${Object.keys(client).join(', ')}`);
		}

		const queryCheckUid = await repoClient.query('SELECT id FROM client WHERE client_uid = $1', [client.client_uid]);
		const client_id = queryCheckUid.rows.length > 0 ? queryCheckUid.rows[0].id : null;
		if (client_id) client.id = client_id;

		const contact = client.contacts?.[0] ? { ...client.contacts[0], index: 0 } : null;

		// Process contacts
		client.contacts = client.contacts?.length
			? JSON.stringify(client.contacts.filter((c) => !c.index).map((c, i) => ({ ...c, index: i })))
			: null;

		let query, values;
		if (client.id) {
			query = `UPDATE client SET ${validColumns
				.map((column, index) => `${column} = $${index + 2}`)
				.join(', ')}, modified_at = NOW() WHERE id = $1 RETURNING *`;
			values = [client.id, ...validColumns.map((column) => client[column])];
		} else {
			query = `INSERT INTO client (${validColumns.join(',')}, created_at, modified_at) 
                     VALUES (${validColumns.map((_, index) => `$${index + 1}`).join(',')}, NOW(), NOW())
                     RETURNING *`;
			values = validColumns.map((column) => client[column]);
		}

		const result = await repoClient.query(query, values);
		const updatedClient = result.rows[0];

		// Update receipt
		let receiptQuery, receiptValues;
		if (client.id) {
			receiptQuery = `UPDATE receipt SET client_id = $1, contact = $2 WHERE id = $3 RETURNING *`;
			receiptValues = [updatedClient.id, JSON.stringify(contact), client.receipt_id];
		} else {
			receiptQuery = `UPDATE receipt SET client_id = $1, contact = $2 WHERE client->>'client_uid' = $3 RETURNING *`;
			receiptValues = [updatedClient.id, JSON.stringify(contact), client.client_uid];
		}
		await repoClient.query(receiptQuery, receiptValues);

		return updatedClient;
	} catch (error) {
		const enhancedError = new Error(`Failed to update temporary client: ${error.message}`);
		enhancedError.statusCode = 500;
		enhancedError.originalError = error;
		throw enhancedError;
	}
}

/** DELETE */
// Delete protocol
async function deleteProtocol(id) {
	try {
		const query = 'DELETE FROM protocol WHERE id = $1';
		const values = [id];
		await repoClient.query(query, values);

		return { message: 'Protocol deleted successfully' };
	} catch (error) {
		const enhancedError = new Error(`Failed to delete protocol with ID ${id}: ${error.message}`);
		enhancedError.statusCode = 500;
		enhancedError.originalError = error;
		throw enhancedError;
	}
}

// Delete parameter
async function deleteParameter(id) {
	try {
		const query = 'DELETE FROM parameter WHERE id = $1';
		const values = [id];
		await repoClient.query(query, values);

		return { message: 'Parameter deleted successfully' };
	} catch (error) {
		const enhancedError = new Error(`Failed to delete parameter with ID ${id}: ${error.message}`);
		enhancedError.statusCode = 500;
		enhancedError.originalError = error;
		throw enhancedError;
	}
}

// Delete analysis
async function deleteAnalysis({ id, ids }) {
	try {
		// Case 1: Delete a single analysis by ID
		if (id) {
			const query = 'DELETE FROM analysis WHERE id = $1';
			const values = [id];
			await repoClient.query(query, values);
			return { message: 'Analysis deleted successfully' };
		}
		// Case 2: Delete multiple analyses by IDs array
		else if (ids && Array.isArray(ids) && ids.length > 0) {
			const query = 'DELETE FROM analysis WHERE id = ANY($1::int[])';
			const values = [ids];
			await repoClient.query(query, values);
			return { message: `${ids.length} analyses deleted successfully` };
		} else {
			throw new Error('No valid ID or IDs provided for deletion');
		}
	} catch (error) {
		const enhancedError = new Error(`Failed to delete analysis: ${error.message}`);
		enhancedError.statusCode = 500;
		enhancedError.originalError = error;
		throw enhancedError;
	}
}

// Delete receipt
async function deleteReceipt(id) {
	try {
		const query = 'DELETE FROM receipt WHERE id = $1';
		const values = [id];
		await repoClient.query(query, values);

		return { message: 'Receipt deleted successfully' };
	} catch (error) {
		const enhancedError = new Error(`Failed to delete receipt with ID ${id}: ${error.message}`);
		enhancedError.statusCode = 500;
		enhancedError.originalError = error;
		throw enhancedError;
	}
}

// Delete sample
async function deleteSample(id) {
	try {
		const query = 'DELETE FROM sample WHERE id = $1';
		const values = [id];
		await repoClient.query(query, values);

		return { message: 'Sample deleted successfully' };
	} catch (error) {
		const enhancedError = new Error(`Failed to delete sample with ID ${id}: ${error.message}`);
		enhancedError.statusCode = 500;
		enhancedError.originalError = error;
		throw enhancedError;
	}
}

// Delete client
async function deleteClient(id) {
	try {
		const query = 'DELETE FROM client WHERE id = $1';
		const values = [id];
		await repoClient.query(query, values);

		return { message: 'Client deleted successfully' };
	} catch (error) {
		const enhancedError = new Error(`Failed to delete client with ID ${id}: ${error.message}`);
		enhancedError.statusCode = 500;
		enhancedError.originalError = error;
		throw enhancedError;
	}
}

/** MATCH COLUMN */
async function matchValidColumns(table_name, columns) {
	try {
		/** 1. Get table columns from server */
		// Construct the SQL query to get the column names from the information schema
		const validColumnsQuery = `SELECT column_name FROM information_schema.columns WHERE table_name = $1`;
		const validColumnsParams = [table_name];

		// Execute the SQL query
		const validColumnsResult = await repoClient.query(validColumnsQuery, validColumnsParams);

		// Extract the column names from the query result
		const validColumns = validColumnsResult.rows.map((row) => row.column_name);

		/** 2. Match columns */
		// Filter the input columns to include only valid columns
		const matchedColumns = columns.filter((column) => validColumns.includes(column));

		// Return the matched columns
		return matchedColumns; // if no match return []
	} catch (error) {
		const enhancedError = new Error(`Failed to match columns for table ${table_name}: ${error.message}`);
		enhancedError.statusCode = 500;
		enhancedError.originalError = error;
		throw enhancedError;
	}
}

// Lấy danh sách bảng
const getTables = async () => {
	try {
		const result = await pool.query(`
     SELECT column_name FROM information_schema.columns WHERE table_name = 'inventory';
    `);

		// In danh sách bảng
		console.log('Danh sách cột:', result.rows);
	} catch (err) {
		const enhancedError = new Error(`Failed to get tables: ${err.message}`);
		enhancedError.statusCode = 500;
		enhancedError.originalError = err;
		throw enhancedError;
	} finally {
		await pool.end();
	}
};

/** SEARCH */

// Search parameter
async function searchParameter(searchText, matrixValue) {
	try {
		let sqlQuery = `
        SELECT * 
        FROM parameter
        WHERE 
            (parameter_name_unaccent ILIKE '%' || $1 || '%' 
             OR parameter_name ILIKE '%' || $1 || '%' 
             OR similarity(parameter_name_unaccent, $1) > 0.3)
    `;

		const params = [searchText];

		if (matrixValue) {
			sqlQuery += ` ORDER BY similarity(parameter_name_unaccent, $1) DESC, similarity(matrix, $2) DESC `;
			params.push(matrixValue);
		} else {
			sqlQuery += ` ORDER BY similarity(parameter_name_unaccent, $1) DESC`;
		}

		const result = await pool.query(sqlQuery, params);
		return result.rows;
	} catch (error) {
		const enhancedError = new Error(`Failed to search parameters: ${error.message}`);
		enhancedError.statusCode = 500;
		enhancedError.originalError = error;
		throw enhancedError;
	}
}

// Search receipt
async function searchReceipt(query) {
	node.warn(query);
	try {
		const sqlQuery = `
WITH ranked_receipts AS (
    SELECT 
        receipt.id, 
        similarity(LOWER(unaccent(receipt.client->>'client_name')), LOWER(unaccent($1))) AS sim_client_name
    FROM receipt
    JOIN sample ON receipt.id = sample.receipt_id
    WHERE 
        similarity(LOWER(unaccent(sample.sample_name)), LOWER(unaccent($1))) > 0.3
        OR receipt.receipt_uid ILIKE CONCAT('%', $1, '%')
        OR receipt.client->>'client_uid' ILIKE CONCAT('%', $1, '%')
        OR receipt.client->>'client_name' ILIKE CONCAT('%', $1, '%')
        OR sample.sample_uid ILIKE CONCAT('%', $1, '%')
        OR receipt.order_code ILIKE CONCAT('%', $1, '%')
        OR receipt.quote_code ILIKE CONCAT('%', $1, '%')
        OR receipt.sale_recorder ILIKE CONCAT('%', $1, '%')
        OR to_tsvector('simple', receipt.client->>'client_uid') @@ websearch_to_tsquery($1)
        OR to_tsvector('simple', receipt.client->>'client_name') @@ websearch_to_tsquery($1)
        OR to_tsvector('simple', sample.sample_name) @@ websearch_to_tsquery($1)
)
SELECT DISTINCT id, sim_client_name 
FROM ranked_receipts
ORDER BY id DESC
LIMIT 60;
		`;
		const params = [query];
		const result = await pool.query(sqlQuery, params);
		return result.rows;
	} catch (error) {
		const enhancedError = new Error(`Failed to search receipts: ${error.message}`);
		enhancedError.statusCode = 500;
		enhancedError.originalError = error;
		throw enhancedError;
	}
}

// Search recent receipts
async function recentReceipt() {
	try {
		const sqlQuery = `
SELECT DISTINCT receipt.id
FROM receipt
LEFT JOIN sample ON receipt.id = sample.receipt_id
WHERE 
    (sample.status < 3 OR sample.id IS NULL)  -- 👈 Lấy cả receipt không có sample
    AND receipt.created_at > NOW() - INTERVAL '40 days'
ORDER BY id DESC
		`;

		const result = await pool.query(sqlQuery);
		return result.rows;
	} catch (error) {
		const enhancedError = new Error(`Failed to get recent receipts: ${error.message}`);
		enhancedError.statusCode = 500;
		enhancedError.originalError = error;
		throw enhancedError;
	}
}

const postgreSQL = {
	getTables,
	createProtocol,
	getProtocolById,
	getAllProtocols,
	updateProtocol,
	deleteProtocol,
	getAllParameters,
	getAllAnalysis,
	getAllClient,
	getAllReceipt,
	getReceiptByDeadline,
	getAllSample,
	getReceipt,
	getSample,
	getSampleByReceipt,
	getAnalysis,
	getAnalysisBySample,
	getAnalysisByReceipt,
	updateReceipt,
	updateSample,
	updateAnalysis,
	getClient,
	createReceipt,
	createSample,
	createParameter,
	getParameter,
	updateParameter,
	matchParameter,
	deleteParameter,
	getParametersByProtocolId,
	createBulkParameters,
	createAnalysis,
	createBulkAnalysisFromParameters,
	deleteAnalysis,
	searchParameter,
	getBulkParameter,
	searchReceipt,
	recentReceipt,
	deleteReceipt,
	deleteSample,
	deleteClient,
	getTemporaryClient,
	getTemporaryContact,
	updateClient,
	createClient,
	upsertParameterByUid,
	updateTemporaryClient,
	getClientByReceipt,
	createReport,
	getPptUidBySampleUid,
	getReport,
	upsertDraftReport
};

global.set('postgreSQL', postgreSQL);

return msg;
