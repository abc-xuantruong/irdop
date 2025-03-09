const { Pool } = pg;
global.set('pg', pg);
global.set('axios', axios);
// DATABASE CLIENT

// Create a new connection pool with the given configuration
const pool = new Pool({
	user: 'postgres', // USERNAME
	host: 'localhost', // HOST
	database: 'test_new_ui', // DATABASE NAME
	password: 'admin', // PASSWORD
	port: '5432', // PORT
});

(async () => {
	try {
		// Attempt to connect to the database
		// const client = await pool.connect();
		// Set the connected client in the global scope
		global.set('repoClient', pool);
		// Log a success message
		node.warn('[ COMPLETED ] dtb connected');
	} catch (error) {
		// Log an error message if the connection fails
		node.warn('[ ERROR ] dtb connection failed ' + error.message);
		console.error(error);
	}
})();

const repoClient = global.get('repoClient'); // Postgres client

// const repoClient = global.get('labRepoClient');

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

		const validColumns = await matchValidColumns('report', Object.keys(report));
		if (validColumns.length === 0) {
			throw new Error(`Invalid report columns: ${Object.keys(report).join(', ')}`);
		}

		// replace report.header_section : '-- NH&Aacute;P / DRAFT --' -> report.ppt_uid
		report.header_section = report.header_section.replace('-- NH&Aacute;P / DRAFT --', report.ppt_uid);

		report.reference = JSON.stringify(report.reference);

		const query = `INSERT INTO report (${validColumns.join(',')}) 
			VALUES (${validColumns.map((_, index) => `$${index + 1}`).join(',')})
			RETURNING *`;

		const params = validColumns.map((column) => report[column]);
		const result = await repoClient.query(query, params);

		return result.rows[0];
	} catch (error) {
		node.warn(error);
	}
}

// Create protocol
async function createProtocol(protocol) {
	try {
		const validColumns = await matchValidColumns('protocol', Object.keys(protocol));
		if (validColumns.length === 0) {
			throw new Error(`Invalid protocol columns: ${Object.keys(protocol).join(', ')}`);
		}

		const query = `
			INSERT INTO protocol (${validColumns.join(',')}) 
			VALUES (${validColumns.map((_, index) => `$${index + 1}`).join(',')})
			RETURNING *`;

		const params = validColumns.map((column) => protocol[column]);
		const result = await repoClient.query(query, params);

		return result.rows[0];
	} catch (error) {
		node.warn(error);
	}
}

// Create parameter
async function createParameter(parameter) {
	try {
		const validColumns = await matchValidColumns('parameter', Object.keys(parameter));
		if (validColumns.length === 0) {
			throw new Error(`Invalid parameter columns: ${Object.keys(parameter).join(', ')}`);
		}

		const query = `
			INSERT INTO parameter (${validColumns.join(',')}) 
			VALUES (${validColumns.map((_, index) => `$${index + 1}`).join(',')})
			RETURNING *`;

		const params = validColumns.map((column) => parameter[column]);
		const result = await repoClient.query(query, params);

		return result.rows[0];
	} catch (error) {
		node.warn(error);
	}
}

// Create bulk parameters
async function createBulkParameters(parameters) {
	try {
		if (!Array.isArray(parameters) || parameters.length === 0) {
			throw new Error('Parameters must be a non-empty array');
		}

		const validColumns = await matchValidColumns('parameter', Object.keys(parameters[0]));
		if (validColumns.length === 0) {
			throw new Error(`Invalid parameter columns: ${Object.keys(parameters[0]).join(', ')}`);
		}

		const query = `
			INSERT INTO parameter (${validColumns.join(',')}) 
			VALUES ${parameters
				.map((_, i) => `(${validColumns.map((_, j) => `$${i * validColumns.length + j + 1}`).join(',')})`)
				.join(',')}
			RETURNING *`;

		const params = parameters.flatMap((parameter) => validColumns.map((column) => parameter[column]));
		const result = await repoClient.query(query, params);

		return result.rows;
	} catch (error) {
		node.warn(error);
	}
}

//create client
async function createClient(client) {
	try {
		const validColumns = await matchValidColumns('client', Object.keys(client));
		if (validColumns.length === 0) {
			throw new Error(`Invalid client columns: ${Object.keys(client).join(', ')}`);
		}

		client.contacts = JSON.stringify(client?.contacts || []);

		const query = `
			INSERT INTO client (${validColumns.join(',')}) 
			VALUES (${validColumns.map((_, index) => `$${index + 1}`).join(',')})
			RETURNING *`;

		const params = validColumns.map((column) => client[column]);
		const result = await repoClient.query(query, params);

		return result.rows[0];
	} catch (error) {
		node.warn(error);
	}
}

// Create analysis
async function createAnalysis(analysis) {
	try {
		const validColumns = await matchValidColumns('analysis', Object.keys(analysis));
		if (validColumns.length === 0) {
			throw new Error(`Invalid analysis columns: ${Object.keys(analysis).join(', ')}`);
		}

		const query = `
			INSERT INTO analysis (${validColumns.join(',')}) 
			VALUES (${validColumns.map((_, index) => `$${index + 1}`).join(',')})
			RETURNING *`;

		const params = validColumns.map((column) => analysis[column]);
		const result = await repoClient.query(query, params);

		return result.rows[0];
	} catch (error) {
		node.warn(error);
	}
}

async function upsertParameterByUid(parameter) {
	try {
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
			INSERT INTO parameter (${validColumns.join(',')}) 
			VALUES (${validColumns.map((_, index) => `$${index + 1}`).join(',')})
			ON CONFLICT (parameter_uid) DO UPDATE 
			SET ${validColumns
				.slice(1)
				.map((col, index) => `${col} = $${index + validColumns.length + 1}`)
				.join(', ')}
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
		node.warn(error);
		throw error; // Ném lỗi để có thể bắt ở nơi khác
	}
}

// Create bulk analysis from parameters
async function createBulkAnalysisFromParameters(analyses) {
	try {
		if (!Array.isArray(analyses) || analyses.length === 0) {
			throw new Error('Analyses must be a non-empty array');
		}

		const validColumns = await matchValidColumns('analysis', Object.keys(analyses[0]));
		if (validColumns.length === 0) {
			throw new Error(`Invalid analysis columns: ${Object.keys(analyses[0]).join(', ')}`);
		}

		const query = `
			INSERT INTO analysis (${validColumns.join(',')}) 
			VALUES ${analyses
				.map((_, i) => `(${validColumns.map((_, j) => `$${i * validColumns.length + j + 1}`).join(',')})`)
				.join(',')}
			RETURNING *`;

		const params = analyses.flatMap((analysis) => validColumns.map((column) => analysis[column]));
		const result = await repoClient.query(query, params);

		return result.rows;
	} catch (error) {
		node.warn(error);
	}
}

async function createReceipt(receipt) {
	try {
		// Generate baseUid
		const now = new Date();
		const year = now.getFullYear().toString().slice(-2);
		const quarter = Math.floor((now.getMonth() + 3) / 3);
		const monthInQuarter = (now.getMonth() % 3) + 1;
		const day = String(now.getDate()).padStart(2, '0');

		const baseUid = `TNMx${year}${quarter}${monthInQuarter}${day}`;

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

		// Insert the new receipt
		const insertQuery = `
			INSERT INTO receipt (${validColumns.join(',')}) 
			VALUES (${validColumns.map((_, index) => `$${index + 1}`).join(',')})
			RETURNING *;
		`;

		const params = validColumns.map((column) => receipt[column]);
		const insertResult = await repoClient.query(insertQuery, params);

		return insertResult.rows[0];
	} catch (error) {
		node.warn(error);
	}
}

async function createSample(sample) {
	try {
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
				{ fname: 'Tên mẫu / name.', fvalue: sample?.sample_name || '' },
				{ fname: 'Nền mẫu / matrix.', fvalue: sample?.matrix || '' },
				{ fname: 'Số lô / LOT no.', fvalue: '' },
				{ fname: 'Ngày SX / mfg.', fvalue: '' },
				{ fname: 'Nơi SX / mfr.', fvalue: '' },
				{ fname: 'HSD / exp.', fvalue: '' },
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
		node.warn(error);
	}
}

/** READ */
// Get report by sample UID (SELECT ppt_uid)
async function getPptUidBySampleUid({ id, sample_uid }) {

	try {
		if (!id && !sample_uid) throw new Error('Sample id or sample_uid must be not null!');
		const conditional = id ? 'WHERE id = $1' : 'WHERE sample_uid = $1';
		const param = id ? [id] : [sample_uid];
		const query = 'SELECT ppt_uid FROM report ' + conditional;

		const result = await repoClient.query(query, param);
		return result.rows.map((row) => row.ppt_uid);
		
	} catch (error) {
		node.warn(error);
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
		node.warn(error);
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
		node.warn(error);
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
		node.warn(error);
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
		node.warn(param);
		node.warn(query);
		const result = await repoClient.query(query, param);

		return result.rows[0];
	} catch (error) {
		node.warn(error);
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
		node.warn(error);
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
		node.warn(error);
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
		node.warn(error);
	}
}

async function getAllReceipt() {
	try {
		const query = 'SELECT * FROM receipt ORDER BY id DESC';
		const result = await repoClient.query(query);

		return result.rows;
	} catch (error) {
		node.warn(error);
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
		node.warn(error);
	}
}

async function getAllSample() {
	try {
		const query = 'SELECT * FROM sample ORDER BY id DESC';
		const result = await repoClient.query(query);

		return result.rows;
	} catch (error) {
		node.warn(error);
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
		node.warn(error);
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
		node.warn(error);
	}
}

async function getAllAnalysis() {
	try {
		const query = 'SELECT * FROM analysis ORDER BY id DESC';
		const result = await repoClient.query(query);

		return result.rows;
	} catch (error) {
		node.warn(error);
	}
}

async function getAnalysis({ id }) {
	try {
		if (!id) throw new Error('Analysis id must be not null!');
		const query = 'SELECT * FROM analysis WHERE id = $1';
		const result = await repoClient.query(query, [id]);

		return result.rows[0];
	} catch (error) {
		node.warn(error);
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

		const query = 'SELECT * FROM analysis WHERE sample_id = $1 ORDER BY id DESC';
		const result = await repoClient.query(query, [id]);

		return result.rows;
	} catch (error) {
		node.warn(error);
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

		const query = 'SELECT * FROM analysis WHERE receipt_id = $1';
		const result = await repoClient.query(query, [id]);

		return result.rows;
	} catch (error) {
		node.warn(error);
	}
}

async function getAllClient() {
	try {
		const query = 'SELECT * FROM client ORDER BY id DESC';
		const result = await repoClient.query(query);

		return result.rows;
	} catch (error) {
		node.warn(error);
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
		node.warn(error);
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
		node.warn(error);
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
		node.warn(error);
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
		node.warn(error);
	}
}
/** UPDATE */
// Update protocol
async function updateProtocol(protocol) {
	try {
		if (typeof protocol === 'object' && protocol.id) {
			const validColumns = await matchValidColumns('protocol', Object.keys(protocol));
			if (validColumns.length === 0) {
				throw new Error(`Invalid protocol columns: ${Object.keys(protocol).join(', ')}`);
			}

			const query = `UPDATE protocol SET ${validColumns
				.map((column, index) => `${column} = $${index + 2}`)
				.join(', ')} WHERE id = $1 RETURNING *`;
			const values = [protocol.id, ...validColumns.map((column) => protocol[column])];

			const result = await repoClient.query(query, values);

			return result.rows[0];
		} else {
			throw new Error('Invalid protocol');
		}
	} catch (error) {
		node.warn(error);
	}
}

// Update parameter
async function updateParameter(parameter) {
	try {
		if (typeof parameter === 'object' && parameter.id) {
			const validColumns = await matchValidColumns('parameter', Object.keys(parameter));
			if (validColumns.length === 0) {
				throw new Error(`Invalid parameter columns: ${Object.keys(parameter).join(', ')}`);
			}

			const query = `UPDATE parameter SET ${validColumns
				.map((column, index) => `${column} = $${index + 2}`)
				.join(', ')} WHERE id = $1 RETURNING *`;
			const values = [parameter.id, ...validColumns.map((column) => parameter[column])];

			const result = await repoClient.query(query, values);

			return result.rows[0];
		} else {
			throw new Error('Invalid parameter');
		}
	} catch (error) {
		node.warn(error);
	}
}

async function updateReceipt(receipt) {
	try {
		if (typeof receipt === 'object' && receipt.id) {
			const validColumns = await matchValidColumns('receipt', Object.keys(receipt));
			if (validColumns.length === 0) {
				throw new Error(`Invalid receipt columns: ${Object.keys(receipt).join(', ')}`);
			}

			const query = `UPDATE receipt SET ${validColumns
				.map((column, index) => `${column} = $${index + 2}`)
				.join(', ')} WHERE id = $1 RETURNING *`;
			const values = [receipt.id, ...validColumns.map((column) => receipt[column])];

			const result = await repoClient.query(query, values);

			return result.rows[0];
		} else {
			throw new Error('Invalid receipt');
		}
	} catch (error) {
		node.warn(error);
	}
}

async function updateSample(sample) {
	try {
		if (typeof sample === 'object' && sample.id) {
			const validColumns = await matchValidColumns('sample', Object.keys(sample));
			if (validColumns.length === 0) {
				throw new Error(`Invalid sample columns: ${Object.keys(sample).join(', ')}`);
			}
			if (sample?.sample_information) {
				sample.sample_information = JSON.stringify(sample.sample_information);
			}
			const query = `UPDATE sample SET ${validColumns
				.map((column, index) => `${column} = $${index + 2}`)
				.join(', ')} WHERE id = $1 RETURNING *`;
			const values = [sample.id, ...validColumns.map((column) => sample[column])];
			const result = await repoClient.query(query, values);

			return result.rows[0];
		} else {
			throw new Error('Invalid sample');
		}
	} catch (error) {
		node.warn(error);
	}
}

async function updateAnalysis(analysis) {
	try {
		if (typeof analysis === 'object' && analysis.id) {
			const validColumns = await matchValidColumns('analysis', Object.keys(analysis));
			if (validColumns.length === 0) {
				throw new Error(`Invalid analysis columns: ${Object.keys(analysis).join(', ')}`);
			}

			const query = `UPDATE analysis SET ${validColumns
				.map((column, index) => `${column} = $${index + 2}`)
				.join(', ')} WHERE id = $1 RETURNING *`;
			const values = [analysis.id, ...validColumns.map((column) => analysis[column])];

			const result = await repoClient.query(query, values);

			return result.rows[0];
		} else {
			throw new Error('Invalid analysis');
		}
	} catch (error) {
		node.warn(error);
	}
}

async function updateClient(client) {
	try {
		if (typeof client === 'object' && client.id) {
			const validColumns = await matchValidColumns('client', Object.keys(client));
			if (validColumns.length === 0) {
				throw new Error(`Invalid client columns: ${Object.keys(client).join(', ')}`);
			}
			client.contacts = JSON.stringify(client.contacts || []);

			const query = `UPDATE client SET ${validColumns
				.map((column, index) => `${column} = $${index + 2}`)
				.join(', ')} WHERE id = $1 RETURNING *`;
			const values = [client.id, ...validColumns.map((column) => client[column])];

			const result = await repoClient.query(query, values);

			return result.rows[0];
		} else {
			throw new Error('Invalid client');
		}
	} catch (error) {
		node.warn(error);
	}
}

async function updateTemporaryClient(client) {
	try {
		if (typeof client !== 'object' || !client) {
			throw new Error('Invalid client');
		}

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
				.join(', ')} WHERE id = $1 RETURNING *`;
			values = [client.id, ...validColumns.map((column) => client[column])];
		} else {
			query = `INSERT INTO client (${validColumns.join(',')}) 
                     VALUES (${validColumns.map((_, index) => `$${index + 1}`).join(',')})
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
		console.error('Error in updateTemporaryClient:', error);
		throw error;
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
		node.warn(error);
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
		node.warn(error);
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
		node.warn(error);
		return { error: error.message };
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
		node.warn(error);
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
		node.warn(error);
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
		node.warn(error);
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
		node.warn('Matched columns:' + matchedColumns);

		// Return the matched columns
		return matchedColumns; // if no match return []
	} catch (error) {
		// Handle any errors that occur during the operation
		node.warn(error);
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
		console.error('Lỗi khi lấy danh sách bảng:', err);
	} finally {
		await pool.end();
	}
};

/** SEARCH */

// Search parameter
async function searchParameter(searchText, matrixValue) {
	let sqlQuery = `
        SELECT * 
        FROM parameter
        WHERE 
            (parameter_name_unaccent ILIKE '%' || $1 || '%' 
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
}

// Search receipt
async function searchReceipt(query) {
	node.warn(query);
	try {
		const sqlQuery = `
WITH ranked_receipts AS (
    SELECT receipt.id, 
           similarity(LOWER(unaccent(receipt.client->>'client_name')), LOWER(unaccent($1))) AS sim_client_name
    FROM receipt
    JOIN sample ON receipt.id = sample.receipt_id
    WHERE 
        similarity(LOWER(unaccent(sample.sample_name)), LOWER(unaccent($1))) > 0.3
        OR to_tsvector('simple', receipt.client->>'client_uid') @@ websearch_to_tsquery($1)
        OR to_tsvector('simple', receipt.client->>'client_name') @@ websearch_to_tsquery($1)
        OR to_tsvector('simple', sample.sample_name) @@ websearch_to_tsquery($1)
)
SELECT DISTINCT id, sim_client_name 
FROM ranked_receipts
ORDER BY sim_client_name DESC
LIMIT 60;
		`;
		const params = [query];
		const result = await pool.query(sqlQuery, params);
		return result.rows;
	} catch (error) {
		node.warn(error);
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
    (sample.status < 4 OR sample.id IS NULL)  -- 👈 Lấy cả receipt không có sample
    AND receipt.created_at > NOW() - INTERVAL '40 days';

		`;

		const result = await pool.query(sqlQuery);
		return result.rows;
	} catch (error) {
		node.warn(error);
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
};

global.set('postgreSQL', postgreSQL);

return msg;
