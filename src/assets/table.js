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

/** HELPER FUNCTION */
function checkAndStringify(param) {
  // Nếu param đã là chuỗi và có thể parse thành JSON hợp lệ
  if (typeof param === 'string') {
    try {
      JSON.parse(param);
      return param; // Trả về chuỗi gốc nếu là JSON hợp lệ
    } catch (e) {
      // Nếu không parse được, stringify param
      return JSON.stringify(param);
    }
  }
  // Nếu param không phải chuỗi, stringify nó
  return JSON.stringify(param);
}

/** CREATE */
async function createLog({ headers, eventType, targetType, targetName, targetUID, reqData, resData, outcome, severity }) {
  try {
    // Gán giá trị mặc định
    const finalOutcome = outcome || 'success';
    const finalSeverity = severity || 'INFORMATION';

    // Tạo đối tượng identity từ headers
    const identity = {
      identityUID: headers['identity-uid'],
      identityName: headers['identity-name'],
    };

    // Lấy appUID từ headers
    const appUID = headers['x-fh-app-uid'];

    // Lấy sessionUID từ headers.authorization (Bearer token)
    const sessionUID = headers.authorization ? headers.authorization.split(' ')[1] : null;

    // Lấy targetID từ reqData.id nếu có
    const targetID = reqData && reqData.id ? reqData.id : null;

    // Tạo message cho eventDetails dựa trên các thông tin
    let message = '';
    const identityName = identity.identityName || 'Unknown user';
    message = `${finalSeverity}: ${identityName} has ${eventType.charAt(0).toUpperCase() + eventType.slice(1)} on the entity ${targetType}`;
    if (targetName) message += ` named: ${targetName || '--'}`;
    if (targetUID) message += ` with UID: ${targetUID || '--'}`;
    message += ` ${finalOutcome === 'success' ? 'successfully' : 'failed'}`;

    // Tạo đối tượng eventDetails
    const eventDetails = {
      reqData,
      resData,
      message,
    };

    // Tạo đối tượng chứa dữ liệu để chèn (sử dụng tên cột chữ thường)
    const logData = {
      identity: JSON.stringify(identity),
      event_type: eventType, // Chuyển thành chữ thường để khớp với tên cột trong DB
      outcome: finalOutcome,
      target_type: targetType, // Chuyển thành chữ thường
      target_id: targetID, // Lấy từ reqData.id
      target_uid: targetUID || null,
      target_name: targetName || null, 
      event_details: JSON.stringify(eventDetails),
      app_uid: appUID,
      session_uid: sessionUID, // Lấy từ headers.authorization
      severity: finalSeverity,
    };
    node.warn(logData);

    // Lọc các cột hợp lệ
    const validColumns = await matchValidColumns('logs', Object.keys(logData));
    if (validColumns.length === 0) {
      throw new Error(`Invalid log columns: ${Object.keys(logData).join(', ')}`);
    }

    // Tạo câu truy vấn SQL
    const queryText = `
      INSERT INTO logs (${validColumns.join(',')}) 
      VALUES (${validColumns.map((_, index) => `$${index + 1}`).join(',')})
      RETURNING *;
    `;

    const values = validColumns.map(column => logData[column]);

    // Thực hiện truy vấn
    const result = await pool.query(queryText, values);
    console.log(`Log inserted with ID: ${result.rows[0].logid}`);
    return result.rows[0];
  } catch (error) {
    const enhancedError = new Error(`Failed to log event: ${error.message}`);
    enhancedError.statusCode = 500;
    enhancedError.originalError = error;
    throw enhancedError;
  }
}

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
		let splitSampleUid = report.sample_uid.split('-'); // "SPxYYQMDDTT"
		let date = splitSampleUid[0].slice(2); // "xYYQMDDTT" "XX"
		report.ppt_uid = `PPT${date}${splitSampleUid[1]}-DRAFT`;

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

		// Check if report with this ppt_uid already exists
		const checkQuery = 'SELECT id FROM report WHERE ppt_uid = $1';
		const checkResult = await repoClient.query(checkQuery, [report.ppt_uid]);

		let result;

		if (checkResult.rows.length > 0) {
			// Update existing report
			const reportId = checkResult.rows[0].id;

			const query = `UPDATE report SET 
                ${validColumns.map((column, index) => `${column} = $${index + 2}`).join(', ')}, 
                modified_at = NOW() 
                WHERE id = $1 
                RETURNING *`;

			const params = [reportId, ...validColumns.map((column) => report[column])];
			result = await repoClient.query(query, params);
		} else {
			// Insert new report
			const query = `INSERT INTO report (${validColumns.join(',')}, created_at, modified_at) 
                VALUES (${validColumns.map((_, index) => `$${index + 1}`).join(',')}, NOW(), NOW())
                RETURNING *`;

			const params = validColumns.map((column) => report[column]);
			result = await repoClient.query(query, params);
		}

		return result.rows[0];
	} catch (error) {
		const enhancedError = new Error(`Failed to upsert draft report: ${error.message}`);
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
		
		if(protocol.protocol_file_id){
		    protocol.protocol_file_id = checkAndStringify(protocol.protocol_file_id);
		}

		if(protocol.report_file_id){
		    protocol.report_file_id = checkAndStringify(protocol.report_file_id);
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

async function createParameter(parameter) {
	try {
		// Remove timestamp fields - let PostgreSQL handle them
		delete parameter.created_at;
		delete parameter.modified_at;

		if (!parameter.parameter_uid) {
			// Determine prefix and generate new parameter_uid
			const prefix = parameter.field === 'Vi sinh' ? 'VS' : 'HL';

			// Query to find the highest sequence number for the given prefix
			const maxUidQuery = `
				SELECT parameter_uid 
				FROM parameter 
				WHERE parameter_name LIKE $1 
				ORDER BY parameter_uid DESC 
				LIMIT 1`;

			const result = await repoClient.query(maxUidQuery, [`${prefix}%`]);
			let newSequence = '0001'; // Default sequence if no records exist

			if (result.rows.length > 0) {
				const lastUid = result.rows[0].parameter_name;
				const lastSequence = parseInt(lastUid.slice(2), 10); // Extract XXXX part
				newSequence = (lastSequence + 1).toString().padStart(4, '0'); // Increment and pad
			}

			// Assign new parameter_uid
			parameter.parameter_uid = `${prefix}${newSequence}`;
		}
		// Validate columns
		const validColumns = await matchValidColumns('parameter', Object.keys(parameter));
		if (validColumns.length === 0) {
			throw new Error(`Invalid parameter columns: ${Object.keys(parameter).join(', ')}`);
		}

		// Build and execute insert query
		const query = `
			INSERT INTO parameter (${validColumns.join(',')}, created_at, modified_at) 
			VALUES (${validColumns.map((_, index) => `$${index + 1}`).join(',')}, NOW(), NOW())
			RETURNING *`;

		const params = validColumns.map((column) => parameter[column]);
		const insertResult = await repoClient.query(query, params);

		return insertResult.rows[0];
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

		// Process each parameter: remove invalid fields, assign parameter_uid if missing
		parameters = await Promise.all(
			parameters.map(async (param) => {
				// Create a new object to avoid modifying the original
				const newParam = { ...param };

				// Remove keys with null, undefined, or empty string values
				Object.keys(newParam).forEach((key) => {
					if (newParam[key] === null || newParam[key] === undefined || newParam[key] === '') {
						delete newParam[key];
					}
				});

				// Remove timestamp fields
				delete newParam.created_at;
				delete newParam.modified_at;

				// Generate parameter_uid if not provided
				if (!newParam.parameter_uid) {
					// Determine prefix based on field
					const prefix = newParam.field === 'Vi sinh' ? 'VS' : 'HL';

					// Query to find the highest sequence number for the given prefix
					const maxUidQuery = `
                        SELECT parameter_uid 
                        FROM parameter 
                        WHERE parameter_uid LIKE $1 
                        ORDER BY parameter_uid DESC 
                        LIMIT 1`;

					const result = await repoClient.query(maxUidQuery, [`${prefix}%`]);
					let newSequence = '0001'; // Default sequence if no records exist

					if (result.rows.length > 0) {
						const lastUid = result.rows[0].parameter_uid;
						const lastSequence = parseInt(lastUid.slice(2), 10); // Extract XXXX part
						newSequence = (lastSequence + 1).toString().padStart(4, '0'); // Increment and pad
					}

					// Assign new parameter_uid
					newParam.parameter_uid = `${prefix}${newSequence}`;
				}

				return newParam;
			}),
		);

		// Validate columns based on the first parameter
		const validColumns = await matchValidColumns('parameter', Object.keys(parameters[0]));
		if (validColumns.length === 0) {
			throw new Error(`Invalid parameter columns: ${Object.keys(parameters[0]).join(', ')}`);
		}

		// Construct the INSERT query
		const query = `
            INSERT INTO parameter (${validColumns.join(',')}, created_at, modified_at) 
            VALUES ${parameters
							.map(
								(_, i) =>
									`(${validColumns.map((_, j) => `$${i * validColumns.length + j + 1}`).join(',')}, NOW(), NOW())`,
							)
							.join(',')}
            RETURNING *`;

		// Flatten parameters for query values
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
		
		const sample = await getSample({id: analysis.sample_id});
		const receipt = await getReceipt({id: analysis.receipt_id});
		if (!sample || !receipt) throw new Error('sample and receipt do not exist');
		analysis.receipt_uid = receipt.receipt_uid;
		analysis.sample_uid = sample.sample_uid;
		

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

		// Chỉ lấy các key hợp lệ, bổ sung thêm field
		const validColumns = ['parameter_uid', 'parameter_name', 'matrix', 'protocol_code', 'protocol_source', 'field'];
		const filteredParam = validColumns.reduce((acc, key) => {
			if (parameter[key] !== undefined) acc[key] = parameter[key];
			return acc;
		}, {});

		// Nếu không có dữ liệu hợp lệ, báo lỗi
		if (Object.keys(filteredParam).length === 0) {
			throw new Error('No valid columns provided for upsert.');
		}

		// Kiểm tra parameter_uid và field
		if (!parameter.parameter_uid) {
			// Không có parameter_uid, tạo mới theo logic của hàm createParameter
			const prefix = parameter.field === 'Vi sinh' ? 'VS' : 'HL';

			// Query to find the highest sequence number for the given prefix
			const maxUidQuery = `
				SELECT parameter_uid 
				FROM parameter 
				WHERE parameter_uid LIKE $1 
				ORDER BY parameter_uid DESC 
				LIMIT 1`;

			const result = await repoClient.query(maxUidQuery, [`${prefix}%`]);
			let newSequence = '0001'; // Default sequence if no records exist

			if (result.rows.length > 0) {
				const lastUid = result.rows[0].parameter_uid;
				const lastSequence = parseInt(lastUid.slice(2), 10); // Extract XXXX part
				newSequence = (lastSequence + 1).toString().padStart(4, '0'); // Increment and pad
			}

			// Assign new parameter_uid
			parameter.parameter_uid = `${prefix}${newSequence}`;
		} else {
			// Có parameter_uid, kiểm tra xem có khớp với field không
			const prefix = parameter.parameter_uid.slice(0, 2); // Get "HL" or "VS"
			const expectedField = prefix === 'VS' ? 'Vi sinh' : 'Hóa lý';

			// Nếu field không khớp với prefix, tạo parameter_uid mới theo field
			if (parameter.field && parameter.field !== expectedField) {
				const correctPrefix = parameter.field === 'Vi sinh' ? 'VS' : 'HL';

				// Query to find the highest sequence number for the given prefix
				const maxUidQuery = `
					SELECT parameter_uid 
					FROM parameter 
					WHERE parameter_uid LIKE $1 
					ORDER BY parameter_uid DESC 
					LIMIT 1`;

				const result = await repoClient.query(maxUidQuery, [`${correctPrefix}%`]);
				let newSequence = '0001'; // Default sequence if no records exist

				if (result.rows.length > 0) {
					const lastUid = result.rows[0].parameter_uid;
					const lastSequence = parseInt(lastUid.slice(2), 10); // Extract XXXX part
					newSequence = (lastSequence + 1).toString().padStart(4, '0'); // Increment and pad
				}

				// Assign new parameter_uid theo field đúng
				parameter.parameter_uid = `${correctPrefix}${newSequence}`;
			}
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

        // Process each analysis to fetch sample and receipt, and remove timestamp fields
        analyses = await Promise.all(
            analyses.map(async (analysis) => {
                const sample = await getSample({ id: analysis.sample_id });
                const receipt = await getReceipt({ id: analysis.receipt_id });
                if (!sample || !sample.sample_uid) {
                    throw new Error(`Invalid sample for sample_id: ${analysis.sample_id}`);
                }
                if (!receipt || !receipt.receipt_uid) {
                    throw new Error(`Invalid receipt for receipt_id: ${analysis.receipt_id}`);
                }

                analysis.sample_uid = sample.sample_uid;
                analysis.receipt_uid = receipt.receipt_uid;

                const newAnalysis = { ...analysis };
                delete newAnalysis.created_at;
                delete newAnalysis.modified_at;
                return newAnalysis;
            })
        );


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

        if (!result.rows) {
            throw new Error('No rows returned from bulk insert query');
        }

        return result.rows;
    } catch (error) {
        node.warn(error.stack);
        const enhancedError = new Error(`Failed to create bulk analyses: ${error.message}`);
        enhancedError.statusCode = 500;
        enhancedError.originalError = error;
        throw enhancedError;
    }
}
async function createReceipt(receipt) {
	try {
		delete receipt.created_at;
		delete receipt.modified_at;

		if (!receipt.receipt_date) {
			receipt.receipt_date = new Date();
		}
		
		if (!receipt.pay_status){
		    receipt.pay_status = 1;
		}

		// Generate baseUid
		const now = new Date();
		const year = now.getFullYear().toString().slice(-2);
		const day = String(now.getDate()).padStart(2, '0');

		// Map month (1-12) to corresponding letter
		const monthMap = {
			1: 'a',
			2: 'c',
			3: 'e',
			4: 'm',
			5: 'n',
			6: 'o',
			7: 'r',
			8: 's',
			9: 'u',
			10: 'v',
			11: 'x',
			12: 'z',
		};
		const monthLetter = monthMap[now.getMonth() + 1];

		const baseUid = `TNM${year}${monthLetter}${day}`;

		// Query to get the maximum value of the last two characters
		let query = `
		SELECT MAX(SUBSTRING(receipt_uid FROM LENGTH(receipt_uid) - 1 FOR 2)) AS max_suffix
		FROM receipt
		WHERE receipt_uid LIKE '${baseUid}%';
	`;
		let result = await repoClient.query(query);
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

		// Assign values to record_code and request_number
		receipt.record_code = receipt.receipt_uid.slice(-5); // Use last 5 characters receipt_uid
		receipt.request_number = receipt.receipt_uid.slice(-5); // Same value for request_number

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
		
		sample.receipt_uid = receiptUid;

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
					fvalue: new Date().toLocaleDateString('vi-VN'),
				},
				{ fname: 'Ngày thử nghiệm / test date.', fvalue: '' },
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
			const data = { ppt_uid: row.ppt_uid, publish_date: row.created_at };
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

// Get protocols by equipment
async function getProtocolByEquipment(equipmentParam) {
    try {
        const query = `
            SELECT * 
            FROM protocol 
            WHERE EXISTS (
                SELECT 1 
                FROM unnest(equipment) AS eq 
                WHERE eq ILIKE $1
            )`;
        const values = [`%${equipmentParam}%`]; // Tìm kiếm chuỗi con
        const result = await repoClient.query(query, values);

        const protocols = result.rows;
        return protocols;
    } catch (error) {
        const enhancedError = new Error(`Failed to get protocols with equipment containing "${equipmentParam}": ${error.message}`);
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

async function getReceiptByDeadline({ start, end }) {
	try {
		const query = 'SELECT * FROM receipt WHERE deadline BETWEEN $1 AND $2 ORDER BY deadline ASC';
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

async function getReceiptByCreatedAt({ start, end }) {
	try {
		const query = 'SELECT * FROM receipt WHERE created_at BETWEEN $1 AND $2 ORDER BY created_at ASC';
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

		const query = 'SELECT * FROM sample WHERE receipt_id = $1 ORDER BY id ASC';
		const result = await repoClient.query(query, [id]);

		return result.rows;
	} catch (error) {
		const enhancedError = new Error(`Failed to get samples by receipt: ${error.message}`);
		enhancedError.statusCode = 500;
		enhancedError.originalError = error;
		throw enhancedError;
	}
}

async function getSampleUidsBySampleUid({ sample_uid }) {
	try {
		// Kiểm tra đầu vào
		if (!sample_uid || typeof sample_uid !== 'string') {
			throw new Error('sample_uid must be a non-empty string');
		}

		// Bỏ 3 ký tự cuối của sample_uid
		const baseSampleUid = sample_uid.slice(0, -3); // 'SP2513x2404-09' -> 'SP2513x2404'

		const query = `
      SELECT *
      FROM sample
      WHERE sample_uid ILIKE $1
      ORDER BY id DESC
    `;
		const result = await repoClient.query(query, [`%${baseSampleUid}%`]);

		return result.rows;
	} catch (error) {
		const enhancedError = new Error(`Failed to get samples by sample_uid: ${error.message}`);
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

			// Remove keys with null, undefined, or empty string values
			Object.keys(protocol).forEach((key) => {
				if (protocol[key] === null || protocol[key] === undefined || protocol[key] === '') {
					delete protocol[key];
				}
			});

		
			if (protocol.protocol_file_id) {
				protocol.protocol_file_id = JSON.stringify(protocol.protocol_file_id);
			}
			if (protocol.report_file_id) {
				protocol.report_file_id = JSON.stringify(protocol.report_file_id);
			}

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
		console.error('Database query error:', error); // Ghi log lỗi
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
            
//             if(receipt.transactions){
// 				receipt.transactions = JSON.stringify(receipt.transactions);
// 			}

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
			// Clean result_value and result_unit if they exist
			if (analysis.result_value) {
				analysis.result_value = cleanHtmlTags(analysis.result_value);
			}
			if (analysis.result_unit) {
				analysis.result_unit = cleanHtmlTags(analysis.result_unit);
			}

			// Remove timestamp fields
			delete analysis.created_at;
			delete analysis.modified_at;
			if(analysis.accreditation && analysis.accreditation == '107'){
			    analysis.accreditation = 'TĐC';
			}

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

function cleanHtmlTags(htmlString) {
	if (!htmlString) return htmlString;

	// Replace span tags and keep content
	let cleaned = htmlString.replace(/<span[^>]*>(.*?)<\/span>/gi, '$1');

	// Replace p tags, keeping only the tag without attributes
	cleaned = cleaned.replace(/<p[^>]*>(.*?)<\/p>/gi, '<p>$1</p>');

	// Keep only allowed tags (p, sup, sub, including their closing tags) and remove all other tags
	cleaned = cleaned.replace(/<(?!\/?p\b|\/?sup\b|\/?sub\b)[^>]+>/gi, '');

	// Clean up any extra whitespace and newlines
	cleaned = cleaned.trim().replace(/\n\s*\n/g, '\n');

	return cleaned;
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
        OR receipt.record_code ILIKE CONCAT('%', $1, '%')
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

async function overdueReceipt() {
	try {
		const sqlQuery = `
        SELECT DISTINCT receipt.id
        FROM receipt
        LEFT JOIN analysis ON receipt.id = analysis.receipt_id
        LEFT JOIN sample ON sample.receipt_id = receipt.id
        WHERE 
            receipt.created_at > NOW() - INTERVAL '50 days'
            AND analysis.deadline < NOW()
            AND (analysis.result_value IS NULL 
                 OR analysis.result_value = '' 
                 OR analysis.result_value = '<p></p>')
            AND sample.status < 3
        ORDER BY receipt.id ASC;
        ;`;

		const result = await pool.query(sqlQuery);
		return result.rows;
	} catch (error) {
		const enhancedError = new Error(`Failed to get recent receipts: ${error.message}`);
		enhancedError.statusCode = 500;
		enhancedError.originalError = error;
		throw enhancedError;
	}
}

async function insertOrUpdateOrder(order) {
	try {
		// Remove timestamp fields if they exist
		delete order.created_at;
		delete order.modified_at;

		// Validate that order_code is provided
		if (!order.order_code) {
			throw new Error('order_code is required');
		}

		// Stringify JSON fields if they are objects
		if (order.client && typeof order.client === 'object') {
			order.client = JSON.stringify(order.client);
		}
		if (order.samples && Array.isArray(order.samples)) {
			order.samples = order.samples.map(sample => 
				typeof sample === 'object' ? JSON.stringify(sample) : sample
			);
		}

		// Get valid columns for the order table
		const validColumns = await matchValidColumns('order', Object.keys(order));
		if (validColumns.length === 0) {
			throw new Error(`Invalid order columns: ${Object.keys(order).join(', ')}`);
		}

		// Create UPSERT query using ON CONFLICT
		const query = `
			INSERT INTO "order" (${validColumns.join(',')}) 
			VALUES (${validColumns.map((_, index) => `$${index + 1}`).join(',')})
			ON CONFLICT (order_code) DO UPDATE 
			SET ${validColumns
				.filter(col => col !== 'order_code') // Exclude primary key from update
				.map((col, index) => `${col} = $${index + validColumns.length + 1}`)
				.join(', ')}
			RETURNING *`;

		// Prepare parameters: first set for INSERT, second set for UPDATE
		const insertParams = validColumns.map((column) => order[column]);
		const updateParams = validColumns
			.filter(col => col !== 'order_code')
			.map((column) => order[column]);
		
		const params = [...insertParams, ...updateParams];

		// Execute the query
		const result = await repoClient.query(query, params);
		
		return result.rows[0];
	} catch (error) {
		const enhancedError = new Error(`Failed to insert or update order: ${error.message}`);
		enhancedError.statusCode = 500;
		enhancedError.originalError = error;
		throw enhancedError;
	}
}

async function getOrderByCode(order_code) {
    try {
        if (!order_code) {
            throw new Error('order_code is required');
        }

        const query = 'SELECT * FROM "order" WHERE order_code = $1';
        const result = await repoClient.query(query, [order_code]);

        return result.rows[0] || null;
    } catch (error) {
        const enhancedError = new Error(`Failed to get order by code ${order_code}: ${error.message}`);
        enhancedError.statusCode = 500;
        enhancedError.originalError = error;
        throw enhancedError;
    }
}

async function matchParameterMatrix(input) {
	try {
		// Ensure input is an array
		const inputArray = Array.isArray(input) ? input : [{ analysis: input.analysis, matrix: input.matrix }];

		// Query template for finding parameters with similar parameter_name using trigram similarity
		const query = `
            SELECT 
                id,
                parameter_uid,
                parameter_name,
                matrix,
                protocol_id,
                protocol_source,
                protocol_code,
                default_unit,
                reference,
                field,
                SIMILARITY(parameter_name, $1) as name_similarity,
                SIMILARITY(matrix, $2) as matrix_similarity
            FROM parameter
            WHERE SIMILARITY(parameter_name, $1) > 0.8
                AND SIMILARITY(matrix, $2) > 0.8
            ORDER BY 
                SIMILARITY(parameter_name, $1) DESC,
                SIMILARITY(matrix, $2) DESC
            LIMIT 1;`

		// Process each input object concurrently
		const results = await Promise.all(
			inputArray.map(async ({ analysis, matrix }) => {
				try {
					const result = await repoClient.query(query, [analysis, matrix]);

					if (result.rows.length > 0) {
						const record = result.rows[0];
						// Check if matrix similarity meets the threshold
						if (record.matrix_similarity > 0.85) {
							// Create new object with renamed id to parameter_id
							const { id, ...rest } = record;
							return {
								parameter_id: id,
								...rest,
							};
						}
					}

					// Return default object if no matching record is found
					return { parameter_name: analysis };
				} catch (error) {
					// Handle individual query errors without failing the entire batch
					return { parameter_name: analysis, error: `Query failed: ${error.message}` };
				}
			}),
		);

		return results;
	} catch (error) {
		const enhancedError = new Error(`Failed to match parameter matrix: ${error.message}`);
		enhancedError.statusCode = 500;
		enhancedError.originalError = error;
		throw enhancedError;
	}
}

async function exportReport(interval) {
    try {
        // Calculate the target date based on the interval
        const targetDate = new Date();
        targetDate.setDate(targetDate.getDate() + interval);
        const targetDateString = targetDate.toISOString().split('T')[0]; // Format as YYYY-MM-DD

        // 1. Tiếp nhận mẫu lên app trong ngày
        const receiptCountQuery = `
            SELECT COUNT(*) AS record_count
            FROM receipt
            WHERE DATE(created_at) = $1
        `;
        const receiptCountResult = await repoClient.query(receiptCountQuery, [targetDateString]);

        // 2. Số mẫu bàn giao
        const sampleQuery = `
            SELECT 
                s.sample_uid, 
                s.sample_name, 
                s.sample_description,
                s.id
            FROM sample s
            WHERE DATE(handover_at) = $1
            ORDER BY s.id
        `;
        const sampleResult = await repoClient.query(sampleQuery, [targetDateString]);

        // 3. Số chỉ tiêu bàn giao
        const analysisQuery = `
            SELECT 
                s.sample_uid,
                a.parameter_name,
                a.matrix AS parameter_matrix,
                a.protocol_source,
                a.protocol_code,
                a.deadline,
                a.id
            FROM analysis a
            JOIN sample s ON a.sample_id = s.id
            WHERE DATE(s.handover_at) = $1
            ORDER BY a.id
        `;
        const analysisResult = await repoClient.query(analysisQuery, [targetDateString]);

        // 4. Chỉ tiêu - nền mẫu - số lượng
        const parameterMatrixCountQuery = `
            SELECT 
                a.parameter_name, 
                a.matrix, 
                COUNT(*) AS occurrence_count
            FROM analysis a
            WHERE a.sample_id IN (
                SELECT id
                FROM sample
                WHERE DATE(handover_at) = $1
            )
            GROUP BY a.parameter_name, a.matrix
            ORDER BY a.parameter_name, a.matrix
        `;
        const parameterMatrixCountResult = await repoClient.query(parameterMatrixCountQuery, [targetDateString]);

        // 5. Thầu phụ
        const subcontractorQuery = `
            SELECT 
                a.parameter_name,
                a.ex_info->>'ex_name' AS ex_name,
                (a.ex_info->>'send_at')::timestamp AS send_at,
                a.id
            FROM analysis a
            WHERE a.sample_id IN (
                SELECT id
                FROM sample
                WHERE DATE(handover_at) = $1
            )
            AND a.protocol_source = 'EX'
            ORDER BY a.id
        `;
        const subcontractorResult = await repoClient.query(subcontractorQuery, [targetDateString]);

        // 6. Kết quả từ lab
        const labResultQuery = `
            SELECT 
                a.parameter_name,
                a.matrix,
                a.protocol_source,
                a.protocol_code,
                a.result_value,
                a.result_unit,
                a.deadline,
                a.submit_result_by,
                a.submit_result_at,
                a.id
            FROM analysis a
            JOIN sample s ON a.sample_id = s.id
            WHERE DATE(a.submit_result_at) = $1
            ORDER BY a.id
        `;
        const labResultResult = await repoClient.query(labResultQuery, [targetDateString]);

        // 7. Số lượng (kết quả từ lab)
        const labResultCountQuery = `
            SELECT COUNT(*) 
            FROM analysis a
            WHERE DATE(a.submit_result_at) = $1
        `;
        const labResultCountResult = await repoClient.query(labResultCountQuery, [targetDateString]);

        // 8. Xuất bản
        const reportQuery = `
            SELECT sample_uid, ppt_uid, id
            FROM (
                SELECT 
                    r.sample_uid,
                    r.ppt_uid,
                    r.id,
                    ROW_NUMBER() OVER (PARTITION BY r.sample_uid ORDER BY r.created_at DESC) AS rn
                FROM report r
                WHERE DATE(r.created_at) = $1
                AND r.ppt_uid NOT LIKE '%DRAFT%'
            ) t
            WHERE rn = 1
            ORDER BY id
        `;
        const reportResult = await repoClient.query(reportQuery, [targetDateString]);

        // 9. Gửi đi
        const sentQuery = `
            SELECT 
                r.receipt_uid, 
                r.tracking_number, 
                r.ppt_send_at,
                r.id
            FROM receipt r
            WHERE DATE(r.ppt_send_at) = $1
            AND r.tracking_number IS NOT NULL
            AND r.tracking_number != ''
            ORDER BY r.id
        `;
        const sentResult = await repoClient.query(sentQuery, [targetDateString]);

        // Format the result
        return {
            receiptCount: receiptCountResult.rows[0]?.record_count || 0,
            samples: sampleResult.rows.map(row => ({
                id: row.id,
                sample_uid: row.sample_uid,
                sample_name: row.sample_name,
                sample_description: row.sample_description
            })),
            analysis: analysisResult.rows.map(row => ({
                id: row.id,
                sample_uid: row.sample_uid,
                parameter_name: row.parameter_name,
                parameter_matrix: row.parameter_matrix,
                protocol_source: row.protocol_source,
                protocol_code: row.protocol_code,
                deadline: row.deadline
            })),
            parameterMatrixCount: parameterMatrixCountResult.rows.map(row => ({
                parameter_name: row.parameter_name,
                matrix: row.matrix,
                occurrence_count: row.occurrence_count
            })),
            subcontractors: subcontractorResult.rows.map(row => ({
                id: row.id,
                parameter_name: row.parameter_name,
                ex_name: row.ex_name,
                send_at: row.send_at
            })),
            labResults: labResultResult.rows.map(row => ({
                id: row.id,
                parameter_name: row.parameter_name,
                matrix: row.matrix,
                protocol_source: row.protocol_source,
                protocol_code: row.protocol_code,
                result_value: row.result_value,
                result_unit: row.result_unit,
                deadline: row.deadline,
                submit_result_by: row.submit_result_by,
                submit_result_at: row.submit_result_at
            })),
            labResultCount: labResultCountResult.rows[0]?.count || 0,
            reports: reportResult.rows.map(row => ({
                id: row.id,
                sample_uid: row.sample_uid,
                ppt_uid: row.ppt_uid
            })),
            sent: sentResult.rows.map(row => ({
                id: row.id,
                receipt_uid: row.receipt_uid,
                tracking_number: row.tracking_number,
                ppt_send_at: row.ppt_send_at
            }))
        };
    } catch (error) {
        const enhancedError = new Error(`Failed to get report: ${error.message}`);
        enhancedError.statusCode = 500;
        enhancedError.originalError = error;
        throw enhancedError;
    }
}

async function getCurrentAnalysis(searchTerm){
    /*
    * input searchTerm 
        output:{
            result:[{ parameter_name,protocol_code, completed, total }]
            "pagination": {
                "currentPage": 1,
                "itemsPerPage": length,
                "totalItems": length,
                "totalPages": 1
            }
        }
    * logic:
    * 1. Tìm kiếm trong bảng analysis với điều kiện:
    *        Nối với bảng sample qua s.id = a.sample_id, lấy những bản ghi có s.status < 3 và s.status > 0
    *        Tìm kiếm trong trường parameter_name, hoặc sử dụng similarity để tìm kiếm gần đúng nếu có searchTerm.
    * 2. Lấy các bản ghi có cặp parameter_name và protocol_code không lặp (gộp chung null với "" như một) sau đó đếm rồi trả về các bản ghi với các cột: cặp parameter_name, protocol_code; completed: đến số lượng bản ghi có result_value khác null hoặc khác "" , total: tổng số bản ghi.
    */
    try {
        const sqlQuery = `
        SELECT 
            a.parameter_name,
            a.protocol_code,
            COUNT(CASE WHEN a.result_value IS NOT NULL AND a.result_value != '' THEN
                1 
            END) AS completed,
            COUNT(*) AS total
        FROM analysis a
        JOIN sample s ON s.id = a.sample_id
        WHERE 
            (s.status < 3 AND s.status > 0 AND s.created_at > NOW() - INTERVAL '40 days')
            AND (a.parameter_name ILIKE '%' || $1 || '%' OR similarity(a.parameter_name, $1) > 0.7)
        GROUP BY a.parameter_name, a.protocol_code
        ORDER BY a.parameter_name, a.protocol_code;

        `;

        const result = await repoClient.query(sqlQuery, [searchTerm]);
        const rows = result.rows;
        const response = {
            result: rows.map(row => ({
                parameter_name: row.parameter_name,
                protocol_code: row.protocol_code,
                completed: parseInt(row.completed, 10),
                total: parseInt(row.total, 10)
            })),
            pagination: {
                currentPage: 1,
                itemsPerPage: rows.length,
                totalItems: rows.length,
                totalPages: 1
            }
        };
        return response;
    } catch (error) {
        const enhancedError = new Error(`Failed to get current analysis: ${error.message}`);
        enhancedError.statusCode = 500;
        enhancedError.originalError = error;
        throw enhancedError;
    }

}


const postgreSQL = {
	getTables,
	createProtocol,
	getProtocolById,
	getProtocolByEquipment,
	getAllProtocols,
	updateProtocol,
	deleteProtocol,
	getAllParameters,
	getAllAnalysis,
	getAllClient,
	getAllReceipt,
	getReceiptByDeadline,
	getReceiptByCreatedAt,
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
	upsertDraftReport,
	getSampleUidsBySampleUid,
	overdueReceipt,
	matchParameterMatrix,
	createLog,
	insertOrUpdateOrder,
	getOrderByCode,
	exportReport,
    getCurrentAnalysis
};

global.set('postgreSQL', postgreSQL);

return msg;
