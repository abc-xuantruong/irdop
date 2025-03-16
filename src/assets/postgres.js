const { Pool } = global.get('pg');

// DATABASE CLIENT
// TODO: create client protocol

// Create a new connection pool with the given configuration
const pool = new Pool({
	user: 'postgres', // USERNAME
	host: 'localhost', // HOST
	database: 'test_db', // DATABASE NAME
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
		node.warn('[ COMPLETED ] airdopDB connected');
	} catch (error) {
		// Log an error message if the connection fails
		node.warn('[ ERROR ] airdopDB connection failed ' + error.message);
		console.error(error);
	}
})();

const repoClient = global.get('repoClient'); // Postgres client

// Retrieve the Postgres client from the global scope
// const repoClient = global.get('repoClient');

// CACHE MECHANISM
// Initialize the cache object
const cache = {};
// Set cache expiration time to 4 minutes
const cache_expiration = 4 * 60 * 1000; // 4 minutes
// Set the cache object in the global scope
global.set('cache', cache);

// Initialize cache objects for different entities
cache.receipts = {};
cache.samples = {};
cache.tests = {};
cache.clients = {};
cache.users = {};
cache.testOrders = {};
cache.receiptPrices = {};
cache.protocols = {};
cache.sampleReports = {};
cache.sampleReportTests = {};
cache.samplePrices = {};
cache.libProtocols = {};
cache.processingSamples = {};

// TEST DATA
// Add test data to the cache for receipts
cache.receipts['123'] = {
	cached_at: new Date(),
	value: {
		id: 123,
		receipt_uid: 'TNM.123', // unique id
		client_id: 123,
	},
};

// CRUD & CACHE FUNCTIONS
async function getReceipt(id) {
	/** Get a receipt from the cache or the database
	 * @param {number} id - The id of the receipt to fetch
	 * @returns {object} - The receipt object
	 */
	try {
		if (Number.isInteger(id) && id > 0) {
			/** 1. Check cache */
			if (cache.receipts[id] && cache.receipts[id].cached_at > Date.now() - cache_expiration) {
				return cache.receipts[id].value;
			} else delete cache.receipts[id];

			/** 2. Fetch from server */
			const query = `SELECT * FROM receipts WHERE id = $1`;
			const params = [id];
			const result = await repoClient.query(query, params);

			/** 3. Update cache and return */
			if (result && Array.isArray(result.rows) && result.rows.length > 0) {
				const receipt = {
					...result.rows[0],
					className: 'Receipt',
				};
				cache.receipts[id] = {
					cached_at: Date.now(),
					value: receipt,
				};
				return cache.receipts[id].value;
			}
			return null;
		}
		throw new Error(`Invalid receipt id: ${id}`);
	} catch (error) {
		handleError(error, 'getReceipt');
	}
}

async function getAllReceipts() {
    /** Get all receipts from the cache or the database
     * @returns {array} - An array of receipt objects
     */
    try {
        /** 1. Fetch from server */
        const query = `SELECT * FROM receipts order by id asc where created_at < '2024-12-01'`;
        const result = await repoClient.query(query);

        /** 2. Update cache and return */
        if (result && Array.isArray(result.rows) && result.rows.length > 0) {
            const receipts = result.rows.map((row) => ({
                ...row,
                className: 'Receipt',
            }));
            return receipts;
        }
        return null;
    } catch (error) {
        handleError(error, 'getAllReceipts');
    }
}

async function getAllSamples() {
    /** Get all samples from the cache or the database
     * @returns {array} - An array of sample objects
     */
    try {
        /** 1. Fetch from server */
        const query = `SELECT * FROM samples order by id asc where created_at < '2024-12-01'`;
        const result = await repoClient.query(query);

        /** 2. Update cache and return */
        if (result && Array.isArray(result.rows) && result.rows.length > 0) {
            const samples = result.rows.map((row) => ({
                ...row,
                className: 'Sample',
            }));
            return samples;
        }
        return null;
    } catch (error) {
        handleError(error, 'getAllSamples');
    }
}

async function getAllTestOrders() {
    /** Get all test orders from the cache or the database
     * @returns {array} - An array of test order objects
     */
    try {
        /** 1. Fetch from server */
        const query = `SELECT * FROM test_order order by id asc where created_at < '2024-12-01'`;
        const result = await repoClient.query(query);

        /** 2. Update cache and return */
        if (result && Array.isArray(result.rows) && result.rows.length > 0) {
            const testOrders = result.rows.map((row) => ({
                ...row,
                className: 'TestOrder',
            }));
            return testOrders;
        }
        return null;
    } catch (error) {
        handleError(error, 'getAllTestOrder');
    }
}


async function getSample(id) {
	/** Get a sample from the cache or the database
	 * @param {number} id - The id of the sample to fetch
	 * @returns {object} - The sample object
	 */

	try {
		/** 1. Validate id */
		if (Number.isInteger(id) && id > 0) {
			if (cache.samples[id] && cache.samples[id].cached_at > Date.now() - cache_expiration) {
				return cache.samples[id].value;
			} else delete cache.samples[id];

			/** 2. Fetch from server */
			const query = `SELECT * FROM samples WHERE id = $1`;
			const params = [id];
			const result = await repoClient.query(query, params);

			/** 3. Update cache and return */
			if (result && Array.isArray(result.rows) && result.rows.length > 0) {
				const sample = {
					...result.rows[0],
					className: 'Sample',
				};
				cache.samples[id] = {
					cached_at: Date.now(),
					value: sample,
				};
				return cache.samples[id].value;
			}

			return null;
		}
		throw new Error(`Invalid sample id: ${id}`);
	} catch (error) {
		handleError(error, 'getSample');
	}
}

async function getTest(id) {
	/** Get a test from the cache or the database
	 * @param {number} id - The id of the test to fetch
	 * @returns {object} - The test object
	 */
	try {
		/** 1. Validate id */
		if (Number.isInteger(id) && id > 0) {
			if (cache.tests[id] && cache.tests[id].cached_at > Date.now() - cache_expiration) {
				return cache.tests[id].value;
			} else delete cache.tests[id];

			/** 2. Fetch from server */
			const query = `SELECT * FROM tests WHERE id = $1`;
			const params = [id];
			const result = await repoClient.query(query, params);
			/** 3. Update cache and return */
			if (result && Array.isArray(result.rows) && result.rows.length > 0) {
				const test = {
					...result.rows[0],
					className: 'Test',
				};
				cache.tests[test.id] = {
					cached_at: Date.now(),
					value: test,
				};
				return cache.tests[test.id].value;
			}
			return null;
		}
		throw new Error(`Invalid test id: ${id}`);
	} catch (error) {
		handleError(error, 'getTest');
	}
}

async function getClient(id) {
	/** Get a client from the cache or the database
	 * @param {number} id - The id of the client to fetch
	 * @returns {object} - The client object
	 */
	try {
		/** 1. Validate id */
		if (Number.isInteger(id) && id > 0) {
			if (cache.clients[id] && cache.clients[id].cached_at > Date.now() - cache_expiration) {
				return cache.clients[id].value;
			} else delete cache.clients[id];

			/** 2. Fetch from server */
			const query = `SELECT * FROM clients WHERE id = $1`;
			const params = [id];
			const result = await repoClient.query(query, params);

			/** 3. Update cache and return */
			if (result && Array.isArray(result.rows) && result.rows.length > 0) {
				const client = {
					...result.rows[0],
					className: 'Client',
				};
				cache.clients[client.id] = {
					cached_at: Date.now(),
					value: client,
				};
				return cache.clients[client.id].value;
			}
			return null;
		}
		throw new Error(`Invalid client id: ${id}`);
	} catch (error) {
		handleError(error, 'getClient');
	}
}

async function getReceiptPrice(id) {
	/** Get a receipt price from the cache or the database
	 * @param {number} id - The id of the receipt price to fetch
	 * @returns {object} - The receipt price object
	 */
	try {
		/** 1. Validate id */
		if (Number.isInteger(id) && id > 0) {
			if (cache.receiptPrices[id] && cache.receiptPrices[id].cached_at > Date.now() - cache_expiration) {
				return cache.receiptPrices[id].value;
			} else delete cache.receiptPrices[id];
			/** 2. Fetch from server */
			const query = `SELECT * FROM receipt_prices WHERE id = $1`;
			const params = [id];
			const result = await repoClient.query(query, params);

			/** 3. Update cache and return */
			if (result && Array.isArray(result.rows) && result.rows.length > 0) {
				const receiptPrice = {
					...result.rows[0],
					className: 'ReceiptPrice',
				};
				cache.receiptPrices[receiptPrice.id] = {
					cached_at: Date.now(),
					value: receiptPrice,
				};
				return cache.receiptPrices[receiptPrice.id].value;
			}
			return null;
		}
		throw new Error(`Invalid receipt price id: ${id}`);
	} catch (error) {
		handleError(error, 'getReceiptPrice');
	}
}

async function getProtocol(id) {
	/** Get a protocol from the cache or the database
	 * @param {number} id - The id of the protocol to fetch
	 * @returns {object} - The protocol object
	 */
	try {
		/** 1. Validate id */
		if (Number.isInteger(id) && id > 0) {
			if (cache.protocols[id] && cache.protocols[id].cached_at > Date.now() - cache_expiration) {
				return cache.protocols[id].value;
			} else delete cache.protocols[id];

			/** 2. Fetch from server */
			const query = `SELECT * FROM lib_protocols WHERE id = $1`;
			const params = [id];
			const result = await repoClient.query(query, params);

			/** 3. Update cache and return */
			if (result && Array.isArray(result.rows) && result.rows.length > 0) {
				const protocol = {
					...result.rows[0],
					className: 'Protocol',
				};
				cache.protocols[protocol.id] = {
					cached_at: Date.now(),
					value: protocol,
				};
				return cache.protocols[protocol.id].value;
			}
			return null;
		}
		throw new Error(`Invalid protocol id: ${id}`);
	} catch (error) {
		handleError(error, 'getProtocol');
	}
}

async function getTestOrder(id) {
	/** Get a test order from the cache or the database
	 * @param {number} id - The id of the test order to fetch
	 * @returns {object} - The test order object
	 */
	try {
		/** 1. Validate id */
		if (Number.isInteger(id) && id > 0) {
			if (cache.testOrders[id] && cache.testOrders[id].cached_at > Date.now() - cache_expiration) {
				return cache.testOrders[id].value;
			} else delete cache.testOrders[id];

			/** 2. Fetch from server */
			const query = `SELECT * FROM test_order WHERE id = $1`;
			const params = [id];
			const result = await repoClient.query(query, params);

			/** 3. Update cache and return */
			if (result && Array.isArray(result.rows) && result.rows.length > 0) {
				const testOrder = {
					...result.rows[0],
					className: 'TestOrder',
				};
				cache.testOrders[testOrder.id] = {
					cached_at: Date.now(),
					value: testOrder,
				};
				return cache.testOrders[testOrder.id].value;
			}
			return null;
		}
		throw new Error(`Invalid test order id: ${id}`);
	} catch (error) {
		handleError(error, 'getTestOrder');
	}
}

async function getSampleReport(id) {
	/** Get a sample report from the cache or the database
	 * @param {number} id - The id of the sample report to fetch
	 * @returns {object} - The sample report object
	 */
	try {
		/** 1. Validate id */
		if (Number.isInteger(id) && id > 0) {
			if (cache.sampleReports[id] && cache.sampleReports[id].cached_at > Date.now() - cache_expiration) {
				return cache.sampleReports[id].value;
			} else delete cache.sampleReports[id];

			/** 2. Fetch from server */
			const query = `SELECT * FROM sample_report WHERE id = $1`;
			const params = [id];
			const result = await repoClient.query(query, params);

			/** 3. Update cache and return */
			if (result && Array.isArray(result.rows) && result.rows.length > 0) {
				const sampleReport = {
					...result.rows[0],
					className: 'SampleReport',
				};
				cache.sampleReports[sampleReport.id] = {
					cached_at: Date.now(),
					value: sampleReport,
				};
				return cache.sampleReports[sampleReport.id].value;
			}
			return null;
		}
		throw new Error(`Invalid sample report id: ${id}`);
	} catch (error) {
		handleError(error, 'getSampleReport');
	}
}

async function getSampleReportTest(id) {
	/** Get a sample report test from the cache or the database
	 * @param {number} id - The id of the sample report test to fetch
	 * @returns {object} - The sample report test object
	 */
	try {
		/** 1. Validate id */
		if (Number.isInteger(id) && id > 0) {
			if (cache.sampleReportTests[id] && cache.sampleReportTests[id].cached_at > Date.now() - cache_expiration) {
				return cache.sampleReportTests[id].value;
			} else delete cache.sampleReportTests[id];

			/** 2. Fetch from server */
			const query = `SELECT * FROM sample_report_tests WHERE id = $1`;
			const params = [id];
			const result = await repoClient.query(query, params);

			/** 3. Update cache and return */
			if (result && Array.isArray(result.rows) && result.rows.length > 0) {
				const sampleReportTest = {
					...result.rows[0],
					className: 'SampleReportTest',
				};
				cache.sampleReportTests[sampleReportTest.id] = {
					cached_at: Date.now(),
					value: sampleReportTest,
				};
				return cache.sampleReportTests[sampleReportTest.id].value;
			}
			return null;
		}
		throw new Error(`Invalid sample report test id: ${id}`);
	} catch (error) {
		handleError(error, 'getSampleReportTest');
	}
}

async function getUser(id) {
	/** Get a user from the cache or the database
	 * @param {number} id - The id of the user to fetch
	 * @returns {object} - The user object
	 */
	try {
		/** 1. Validate id */
		if (Number.isInteger(id) && id > 0) {
			if (cache.users[id] && cache.users[id].cached_at > Date.now() - cache_expiration) {
				return cache.users[id].value;
			} else delete cache.users[id];

			/** 2. Fetch from server */
			const query = `SELECT * FROM users WHERE id = $1`;
			const params = [id];
			const result = await repoClient.query(query, params);

			/** 3. Update cache and return */
			if (result && Array.isArray(result.rows) && result.rows.length > 0) {
				const user = {
					...result.rows[0],
					className: 'User',
				};
				cache.users[user.id] = {
					cached_at: Date.now(),
					value: user,
				};
				return cache.users[user.id].value;
			}
			return null;
		}
		throw new Error(`Invalid user id: ${id}`);
	} catch (error) {
		handleError(error, 'getUser');
	}
}

// UPDATE FUNCTIONS
async function setReceipt(receipt) {
	/** Set a receipt in the cache
	 * @param {object} receipt      - The receipt object to set
	 * @param {number} receipt.id   - The id of the receipt to set
	 * @returns {object}            - The receipt object
	 */
	try {
		if (typeof receipt === 'object' && receipt.id && Number.isInteger(receipt.id) && receipt.id > 0) {
			/** 1. Validate receipt */
			const validColumns = await matchValidColumns('receipts', Object.keys(receipt));
			if (validColumns.length !== Object.keys(receipt).length) {
				throw new Error(`Invalid receipt columns: ${Object.keys(receipt).join(', ')}`);
			}

			/** 2. Send to server */
			const query = `
                    UPDATE receipts
                    SET ${validColumns.map((column, index) => `${column} = $${index + 2}`).join(',')}
                    WHERE id = $1
                `;
			const params = [receipt.id, ...validColumns.map((column) => receipt[column])];
			const result = await repoClient.query(query, params);

			/** 3. Update cache */
			if (result && result.rowCount > 0) {
				const updateReceipt = {
					...receipt,
					className: 'Receipt',
				};
				cache.receipts[updateReceipt.id] = {
					cached_at: Date.now(),
					value: receipt,
				};
				return cache.receipts[updateReceipt.id].value;
			}
			throw new Error(`Failed to set receipt: ${receipt}`);
		}
		throw new Error(`Invalid receipt: ${receipt}`);
	} catch (error) {
		handleError(error, 'setReceipt');
	}
}

async function setSample(sample) {
	/** Set a sample in the cache
	 * @param {object} sample      - The sample object to set
	 * @param {number} sample.id   - The id of the sample to set
	 * @returns {object}           - The sample object
	 */
	try {
		if (typeof sample === 'object' && sample.id && Number.isInteger(sample.id) && sample.id > 0) {
			/** 1. Validate sample */
			const validColumns = await matchValidColumns('samples', Object.keys(sample));
			if (validColumns.length !== Object.keys(sample).length) {
				throw new Error(`Invalid sample columns: ${Object.keys(sample).join(', ')}`);
			}

			/** 2. Send to server */
			const query = `
                    UPDATE samples
                    SET ${validColumns.map((column, index) => `${column} = $${index + 2}`).join(',')}
                    WHERE id = $1
                `;
			const params = [sample.id, ...validColumns.map((column) => sample[column])];
			const result = await repoClient.query(query, params);

			/** 3. Update cache */
			if (result && result.rowCount > 0) {
				const updatedSample = {
					...sample,
					className: 'Sample',
				};
				cache.samples[updatedSample.id] = {
					cached_at: Date.now(),
					value: updatedSample,
				};
				return cache.samples[updatedSample.id].value;
			}
			throw new Error(`Failed to set sample: ${sample}`);
		}
		throw new Error(`Invalid sample: ${sample}`);
	} catch (error) {
		handleError(error, 'setSample');
	}
}

async function setTest(test) {
	/** Set a test in the cache
	 * @param {object} test      - The test object to set
	 * @param {number} test.id   - The id of the test to set
	 * @returns {object}         - The test object
	 */
	try {
		if (typeof test === 'object' && test.id && Number.isInteger(test.id) && test.id > 0) {
			/** 1. Validate test */
			const validColumns = await matchValidColumns('tests', Object.keys(test));
			if (validColumns.length !== Object.keys(test).length) {
				throw new Error(`Invalid test columns: ${Object.keys(test).join(', ')}`);
			}

			/** 2. Send to server */
			const query = `
                    UPDATE tests
                    SET ${validColumns.map((column, index) => `${column} = $${index + 2}`).join(',')}
                    WHERE id = $1
                `;
			const params = [test.id, ...validColumns.map((column) => test[column])];
			const result = await repoClient.query(query, params);

			/** 3. Update cache */
			if (result && result.rowCount > 0) {
				const updatedTest = {
					...test,
					className: 'Test',
				};
				cache.tests[updatedTest.id] = {
					cached_at: Date.now(),
					value: updatedTest,
				};
				return cache.tests[updatedTest.id].value;
			}
			throw new Error(`Failed to set test: ${test}`);
		}
		throw new Error(`Invalid test: ${test}`);
	} catch (error) {
		handleError(error, 'setTest');
	}
}

async function setClient(client) {
	/** Set a client in the cache
	 * @param {object} client      - The client object to set
	 * @param {number} client.id   - The id of the client to set
	 * @returns {object}           - The client object
	 */
	try {
		if (typeof client === 'object' && client.id && Number.isInteger(client.id) && client.id > 0) {
			/** 1. Validate client */
			const validColumns = await matchValidColumns('clients', Object.keys(client));
			if (validColumns.length !== Object.keys(client).length) {
				throw new Error(`Invalid client columns: ${Object.keys(client).join(', ')}`);
			}

			/** 2. Send to server */
			const query = `
                    UPDATE clients
                    SET ${validColumns.map((column, index) => `${column} = $${index + 2}`).join(',')}
                    WHERE id = $1
                `;
			const params = [client.id, ...validColumns.map((column) => client[column])];
			const result = await repoClient.query(query, params);

			/** 3. Update cache */
			if (result && result.rowCount > 0) {
				const updatedClient = {
					...client,
					className: 'Client',
				};
				cache.clients[updatedClient.id] = {
					cached_at: Date.now(),
					value: updatedClient,
				};
				return cache.clients[updatedClient.id].value;
			}
			throw new Error(`Failed to set client: ${client}`);
		}
		throw new Error(`Invalid client: ${client}`);
	} catch (error) {
		handleError(error, 'setClient');
	}
}

async function setTestOrder(testOrder) {
	/** Set a test order in the cache
	 * @param {object} testOrder      - The test order object to set
	 * @param {number} testOrder.id   - The id of the test order to set
	 * @returns {object}              - The test order object
	 */
	try {
		if (typeof testOrder === 'object' && testOrder.id && Number.isInteger(testOrder.id) && testOrder.id > 0) {
			/** 1. Validate test order */
			const validColumns = await matchValidColumns('test_order', Object.keys(testOrder));
			if (validColumns.length !== Object.keys(testOrder).length) {
				throw new Error(`Invalid test order columns: ${Object.keys(testOrder).join(', ')}`);
			}

			/** 2. Send to server */
			const query = `
                    UPDATE test_order
                    SET ${validColumns.map((column, index) => `${column} = $${index + 2}`).join(',')}
                    WHERE id = $1
                `;
			const params = [testOrder.id, ...validColumns.map((column) => testOrder[column])];
			const result = await repoClient.query(query, params);

			/** 3. Update cache */
			if (result && result.rowCount > 0) {
				const updatedTestOrder = {
					...testOrder,
					className: 'TestOrder',
				};
				cache.testOrders[updatedTestOrder.id] = {
					cached_at: Date.now(),
					value: updatedTestOrder,
				};
				return cache.testOrders[updatedTestOrder.id].value;
			}
			throw new Error(`Failed to set test order: ${testOrder}`);
		}
		throw new Error(`Invalid test order: ${testOrder}`);
	} catch (error) {
		handleError(error, 'setTestOrder');
	}
}

async function setProtocol(protocol) {
	/** Set a protocol in the cache
	 * @param {object} protocol      - The protocol object to set
	 * @param {number} protocol.id   - The id of the protocol to set
	 * @returns {object}             - The protocol object
	 */
	try {
		if (typeof protocol === 'object' && protocol.id && Number.isInteger(protocol.id) && protocol.id > 0) {
			/** 1. Validate protocol */
			const validColumns = await matchValidColumns('lib_protocols', Object.keys(protocol));
			if (validColumns.length !== Object.keys(protocol).length) {
				throw new Error(`Invalid protocol columns: ${Object.keys(protocol).join(', ')}`);
			}

			/** 2. Send to server */
			const query = `
                    UPDATE lib_protocols
                    SET ${validColumns.map((column, index) => `${column} = $${index + 2}`).join(',')}
                    WHERE id = $1
                `;
			const params = [protocol.id, ...validColumns.map((column) => protocol[column])];
			const result = await repoClient.query(query, params);

			/** 3. Update cache */
			if (result && result.rowCount > 0) {
				const updatedProtocol = {
					...protocol,
					className: 'Protocol',
				};
				cache.protocols[updatedProtocol.id] = {
					cached_at: Date.now(),
					value: updatedProtocol,
				};
				return cache.protocols[updatedProtocol.id].value;
			}
			throw new Error(`Failed to set protocol: ${protocol}`);
		}
		throw new Error(`Invalid protocol: ${protocol}`);
	} catch (error) {
		handleError(error, 'setProtocol');
	}
}

async function setReceiptPrice(receiptPrice) {
	/** Set a receipt price in the cache
	 * @param {object} receiptPrice      - The receipt price object to set
	 * @param {number} receiptPrice.id   - The id of the receipt price to set
	 * @returns {object}                 - The receipt price object
	 */
	try {
		if (
			typeof receiptPrice === 'object' &&
			receiptPrice.id &&
			Number.isInteger(receiptPrice.id) &&
			receiptPrice.id > 0
		) {
			/** 1. Validate receipt price */
			const validColumns = await matchValidColumns('receipt_prices', Object.keys(receiptPrice));
			if (validColumns.length !== Object.keys(receiptPrice).length) {
				throw new Error(`Invalid receipt price columns: ${Object.keys(receiptPrice).join(', ')}`);
			}

			/** 2. Send to server */
			const query = `
                    UPDATE receipt_prices
                    SET ${validColumns.map((column, index) => `${column} = $${index + 2}`).join(',')}
                    WHERE id = $1
                `;

			const params = [receiptPrice.id, ...validColumns.map((column) => receiptPrice[column])];
			const result = await repoClient.query(query, params);
			/** 3. Update cache */
			if (result && result.rowCount > 0) {
				const updatedReceiptPrice = {
					...receiptPrice,
					className: 'ReceiptPrice',
				};
				cache.receiptPrices[updatedReceiptPrice.id] = {
					cached_at: Date.now(),
					value: updatedReceiptPrice,
				};
				return cache.receiptPrices[updatedReceiptPrice.id].value;
			}
			throw new Error(`Failed to set receipt price: ${receiptPrice}`);
		}
		throw new Error(`Invalid receipt price: ${receiptPrice}`);
	} catch (error) {
		handleError(error, 'setReceiptPrice');
	}
}

async function setSampleReport(sampleReport) {
	/** Set a sample report in the cache
	 * @param {object} sampleReport      - The sample report object to set
	 * @param {number} sampleReport.id   - The id of the sample report to set
	 * @returns {object}                 - The sample report object
	 */
	try {
		if (
			typeof sampleReport === 'object' &&
			sampleReport.id &&
			Number.isInteger(sampleReport.id) &&
			sampleReport.id > 0
		) {
			/** 1. Validate sample report */
			const validColumns = await matchValidColumns('sample_report', Object.keys(sampleReport));
			if (validColumns.length !== Object.keys(sampleReport).length) {
				throw new Error(`Invalid sample report columns: ${Object.keys(sampleReport).join(', ')}`);
			}

			/** 2. Send to server */
			const query = `
                    UPDATE sample_report
                    SET ${validColumns.map((column, index) => `${column} = $${index + 2}`).join(',')}
                    WHERE id = $1
                `;
			const params = [sampleReport.id, ...validColumns.map((column) => sampleReport[column])];
			const result = await repoClient.query(query, params);

			/** 3. Update cache */
			if (result && result.rowCount > 0) {
				const updatedSampleReport = {
					...sampleReport,
					className: 'SampleReport',
				};
				cache.sampleReports[updatedSampleReport.id] = {
					cached_at: Date.now(),
					value: updatedSampleReport,
				};
				return cache.sampleReports[updatedSampleReport.id].value;
			}
			throw new Error(`Failed to set sample report: ${sampleReport}`);
		}
		throw new Error(`Invalid sample report: ${sampleReport}`);
	} catch (error) {
		handleError(error, 'setSampleReport');
	}
}

async function setSampleReportTest(sampleReportTest) {
	/** Set a sample report test in the cache
	 * @param {object} sampleReportTest      - The sample report test object to set
	 * @param {number} sampleReportTest.id   - The id of the sample report test to set
	 * @returns {object}                     - The sample report test object
	 */
	try {
		// Check if the sampleReportTest is a valid object and has a valid id
		if (
			typeof sampleReportTest === 'object' &&
			sampleReportTest.id &&
			Number.isInteger(sampleReportTest.id) &&
			sampleReportTest.id > 0
		) {
			/** 1. Validate sample report test */
			// Validate the columns of the sampleReportTest object against the database schema
			const validColumns = await matchValidColumns('sample_report_tests', Object.keys(sampleReportTest));
			if (validColumns.length !== Object.keys(sampleReportTest).length) {
				// Throw an error if there are invalid columns
				throw new Error(`Invalid sample report test columns: ${Object.keys(sampleReportTest).join(', ')}`);
			}

			/** 2. Send to server */
			// Construct the SQL query to update the sample_report_tests table
			const query = `
                    UPDATE sample_report_tests
                    SET ${validColumns.map((column, index) => `${column} = $${index + 2}`).join(',')}
                    WHERE id = $1
                `;
			// Prepare the parameters for the SQL query
			const params = [sampleReportTest.id, ...validColumns.map((column) => sampleReportTest[column])];
			// Execute the SQL query to update the sample_report_tests table
			const result = await repoClient.query(query, params);

			/** 3. Update cache */
			// Check if the update was successful
			if (result && result.rowCount > 0) {
				// Create an updated sample report test object
				const updatedSampleReportTest = {
					...sampleReportTest,
					className: 'SampleReportTest',
				};
				// Update the cache with the updated sample report test object
				cache.sampleReportTests[updatedSampleReportTest.id] = {
					cached_at: Date.now(),
					value: updatedSampleReportTest,
				};
				// Return the updated sample report test object from the cache
				return cache.sampleReportTests[updatedSampleReportTest.id].value;
			}
			// Throw an error if the update failed
			throw new Error(`Failed to set sample report test: ${sampleReportTest.id}`);
		} else {
			// Throw an error if the sampleReportTest object is invalid
			throw new Error('Invalid sample report test object');
		}
	} catch (error) {
		// Handle any errors that occur during the operation
		console.error(error);
		throw error;
	}
}

// DELETE FUNCTIONS
async function delReceipt(id) {
	try {
		if (Number.isInteger(id) && id > 0) {
			const query = `DELETE FROM receipts WHERE id = $1`;
			const params = [id];
			const result = await repoClient.query(query, params);
			if (result && result.rowCount > 0) {
				delete cache.receipts[id];
				return id;
			}
			return null;
		}
		throw new Error(`Invalid receipt id: ${id}`);
	} catch (error) {
		handleError(error, 'delReceipt');
	}
}

async function delSample(id) {
	try {
		if (Number.isInteger(id) && id > 0) {
			const query = `DELETE FROM samples WHERE id = $1`;
			const params = [id];
			const result = await repoClient.query(query, params);
			if (result && result.rowCount > 0) {
				delete cache.samples[id];
				return id;
			}
			return null;
		}
		throw new Error(`Invalid sample id: ${id}`);
	} catch (error) {
		handleError(error, 'delSample');
	}
}

async function delTest(id) {
	try {
		if (Number.isInteger(id) && id > 0) {
			const query = `DELETE FROM tests WHERE id = $1`;
			const params = [id];
			const result = await repoClient.query(query, params);
			if (result && result.rowCount > 0) {
				delete cache.tests[id];
				return id;
			}
			return null;
		}
		throw new Error(`Invalid test id: ${id}`);
	} catch (error) {
		handleError(error, 'delTest');
	}
}

async function delClient(id) {
	try {
		if (Number.isInteger(id) && id > 0) {
			const query = `DELETE FROM clients WHERE id = $1`;
			const params = [id];
			const result = await repoClient.query(query, params);
			if (result && result.rowCount > 0) {
				delete cache.clients[id];
				return id;
			}
			return null;
		}
		throw new Error(`Invalid client id: ${id}`);
	} catch (error) {
		handleError(error, 'delClient');
	}
}

async function delTestOrder(id) {
	try {
		if (Number.isInteger(id) && id > 0) {
			const query = `DELETE FROM test_order WHERE id = $1`;
			const params = [id];
			const result = await repoClient.query(query, params);
			if (result && result.rowCount > 0) {
				delete cache.testOrders[id];
				return id;
			}
			return null;
		}
		throw new Error(`Invalid test order id: ${id}`);
	} catch (error) {
		handleError(error, 'delTestOrder');
	}
}

async function delProtocol(id) {
	try {
		if (Number.isInteger(id) && id > 0) {
			const query = `DELETE FROM lib_protocols WHERE id = $1`;
			const params = [id];
			const result = await repoClient.query(query, params);
			if (result && result.rowCount > 0) {
				delete cache.libProtocols[id];
				return id;
			}
			return null;
		}
		throw new Error(`Invalid protocol id: ${id}`);
	} catch (error) {
		handleError(error, 'delProtocol');
	}
}

async function delReceiptPrice(id) {
	try {
		// Check if the id is valid
		if (!id || !Number.isInteger(id) || id <= 0) {
			throw new Error(`Invalid receipt price id: ${id}`);
		}

		// Construct the SQL query to delete the receipt price
		const query = `DELETE FROM receipt_prices WHERE id = $1`;
		const params = [id];

		// Execute the SQL query
		const result = await repoClient.query(query, params);

		// Check if the deletion was successful
		if (result.rowCount === 0) {
			throw new Error(`Receipt price with id ${id} not found`);
		}

		// Return a success message
		return { message: `Receipt price with id ${id} deleted successfully` };
	} catch (error) {
		// Handle any errors that occur during the operation
		handleError(error, 'delReceiptPrice');
	}
}

// MATCH FUNCTIONS
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
		// Handle any errors that occur during the operation
		handleError(error, 'matchValidColumns');
	}
}

//ADD FUNCTIONS
async function newReceipt(receipt) {
	/**
	 * @param {Object} receipt
	 * @returns {Promise<Object>}
	 */
	try {
		// Validate the receipt object
		if (validateReceipt(receipt)) {
			// Generate a new UID if it doesn't already exist
			// if (!receipt.receipt_uid) receipt.receipt_uid = await getNextUID();

			/** 1. Validate receipt columns */
			// Validate the columns of the receipt object against the database schema
			const validColumns = await matchValidColumns('receipts', Object.keys(receipt));
			if (validColumns.length === 0) throw new Error(`Invalid receipt columns: ${Object.keys(receipt).join(', ')}`);

			/** 2. Send to server */
			// Construct the SQL query to insert the receipt into the database
			const query = `
				INSERT INTO receipts (${validColumns.join(',')}) 
				VALUES (${validColumns.map((_, index) => `$${index + 1}`).join(',')})
				ON CONFLICT (id) 
				DO UPDATE SET 
				${validColumns
				.filter(col => col !== 'id') // Loại trừ cột 'id' để không cập nhật
				.map(col => `${col} = EXCLUDED.${col}`) // Cập nhật các cột còn lại từ EXCLUDED
				.join(', ')}
				RETURNING *;
			`;
			// Prepare the parameters for the SQL query
			const params = validColumns.map((column) => receipt[column]);

			// Execute the SQL query
			const result = await repoClient.query(query, params);

			// Return the newly created receipt
			return result.rows[0];
		} else {
			// Throw an error if the receipt object is invalid
			throw new Error('Invalid receipt object');
		}
	} catch (error) {
		// Handle any errors that occur during the operation
		handleError(error, 'newReceipt');
	}

	function validateReceipt(receipt) {
		// Check if the receipt object is valid
		if (typeof receipt === 'object' && Object.keys(receipt).length > 0) {
			return true;
		}
		return false;
	}

	async function getNextUID() {
		// Get the current date
		const currentDate = new Date();
		const currentYear = currentDate.getFullYear().toString().slice(-2);
		const currentWeek = String(
			Math.floor(
				(currentDate.getTime() - new Date(currentDate.getFullYear(), 0, 1).getTime()) / (1000 * 60 * 60 * 24 * 7),
			) + 1,
		).padStart(2, '0');
		const currentDay = String(currentDate.getDate()).padStart(2, '0');

		// Get the last receipt UID from the database
		const query = `SELECT receipt_uid FROM receipts ORDER BY id DESC LIMIT 1`;
		const result = await repoClient.query(query);
		const lastUID = result.rows[0].receipt_uid || 'PPT.YYWWDD-01';
		const nextIndex =
			lastUID.slice(8, 10) !== currentWeek ? '01' : String(Number(lastUID.slice(11)) + 1).padStart(2, '0');
		const nextReceiptUID = `PPT.${currentYear}${currentWeek}${currentDay}-${nextIndex}`;

		// Return the next receipt UID
		return nextReceiptUID;
	}
}

async function newSample(sample) {
	/**
	 * @param {Object} sample
	 * @returns {Promise<Object>}
	 */
	try {
		if (validateSample(sample)) {
			// if (!sample.sample_uid) sample.sample_uid = await getNextUID(); // Nếu uid đã có (populate task) thì không cần tạo mới

			/** 1. Validate sample columns */
			const validColumns = await matchValidColumns('samples', Object.keys(sample));
			if (validColumns.length === 0) throw new Error(`Invalid sample columns: ${Object.keys(sample).join(', ')}`);

			/** 2. Send to server */
			// Tạo câu truy vấn động với ON CONFLICT
			const query = `
				INSERT INTO samples (${validColumns.join(',')}) 
				VALUES (${validColumns.map((_, index) => `$${index + 1}`).join(',')})
				ON CONFLICT (id) 
				DO UPDATE SET ${validColumns
					.filter((col) => col !== 'id') // Loại bỏ cột 'id' vì không cập nhật
					.map((col) => `${col} = EXCLUDED.${col}`) // Sử dụng EXCLUDED để tham chiếu giá trị mới
					.join(', ')}
				RETURNING *;
			`;

			const params = [...validColumns.map((column) => sample[column])];
			const result = await repoClient.query(query, params);

			/** 3. Update cache */
			if (result && Array.isArray(result.rows) && result.rows.length > 0) {
				const sample = {
					...result.rows[0],
					className: 'Sample',
				};
				cache.samples[sample.id] = {
					cached_at: Date.now(),
					value: sample,
				};
				return cache.samples[sample.id].value;
			}
			return result;
		}
		throw new Error(`Invalid sample: ${sample}`);
	} catch (error) {
		handleError(error, 'newSample');
	}

	function validateSample(sample) {
		if (typeof sample === 'object' && Object.keys(sample).length > 0) {
			return true;
		}
		return false;
	}

	async function getNextUID() {
		// Get current day, week and year
		const currentDate = new Date();
		const currentYear = currentDate.getFullYear().toString().slice(-2);
		const currentWeek = String(
			Math.floor(
				(currentDate.getTime() - new Date(currentDate.getFullYear(), 0, 1).getTime()) / (1000 * 60 * 60 * 24 * 7),
			) + 1,
		).padStart(2, '0');
		const currentDay = String(currentDate.getDate()).padStart(2, '0');

		// Get next receipt UID
		const query = `SELECT sample_uid FROM samples ORDER BY id DESC LIMIT 1`;
		const result = await repoClient.query(query);
		const lastUID = result.rows[0].sample_uid || 'PPT.YYWWDD-01';
		const nextIndex =
			lastUID.slice(5, 7) !== currentWeek ? '01' : String(Number(lastUID.slice(10)) + 1).padStart(2, '0');
		const nextReceiptUID = `SP.${currentYear}${currentWeek}${currentDay}-${nextIndex}`;

		return nextReceiptUID;
	}
}

async function newTest(test) {
	/**
	 * @param {Object} test
	 * @returns {Promise<Object>}
	 */
	try {
		if (validateTest(test)) {
			// Test không có uid
			// if (!test.test_uid) test.test_uid = await getNextUID(); // Nếu uid đã có (populate task) thì không cần tạo mới

			/** 1. Validate test columns */
			const validColumns = await matchValidColumns('tests', Object.keys(test));
			if (validColumns.length === 0) throw new Error(`Invalid test columns: ${Object.keys(test).join(', ')}`);

			/** 2. Send to server */
			// Tạo câu truy vấn động với ON CONFLICT
			const query = `
    INSERT INTO tests (${validColumns.join(',')}) 
    VALUES (${validColumns.map((_, index) => `$${index + 1}`).join(',')})
    ON CONFLICT (id) 
    DO UPDATE SET 
    ${validColumns
					.filter((col) => col !== 'id') // Bỏ qua cột 'id' vì không cần cập nhật
					.map((col) => `${col} = EXCLUDED.${col}`) // Sử dụng EXCLUDED để tham chiếu giá trị mới
					.join(', ')}
    RETURNING *;
`;

			const params = [...validColumns.map((column) => test[column])];
			const result = await repoClient.query(query, params);

			/** 3. Update cache */
			if (result && Array.isArray(result.rows) && result.rows.length > 0) {
				const test = {
					...result.rows[0],
					className: 'Test',
				};
				cache.tests[test.id] = {
					cached_at: Date.now(),
					value: test,
				};
				return cache.tests[test.id].value;
			}
			return result;
		}
		throw new Error(`Invalid test: ${test}`);
	} catch (error) {
		handleError(error, 'newTest');
	}

	function validateTest(test) {
		if (
			typeof test === 'object' &&
			Object.keys(test).length > 0
			// &&
			// test.id === undefined &&
			// test.test_name.trim().length > 0
		) {
			return true;
		}
		return false;
	}
}

async function newClient(client) {
	/**
	 * @param {Object} client
	 * @returns {Promise<Object>}
	 */
	try {
		if (validateClient(client)) {
			/** 1. Validate client columns */
			if (!client.client_uid) client.client_uid = `CL.${crypto.randomUUID().substr(0, 8)}`;
			const validColumns = await matchValidColumns('clients', Object.keys(client));

			if (validColumns.length === 0) throw new Error(`Invalid client columns: ${Object.keys(client).join(', ')}`);

			/** 2. Send to server */
			// Tạo câu truy vấn với ON CONFLICT
			const query = `
    INSERT INTO clients (${validColumns.join(',')}) 
    VALUES (${validColumns.map((_, index) => `$${index + 1}`).join(',')})
    ON CONFLICT (id) 
    DO UPDATE SET 
    ${validColumns
					.filter((col) => col !== 'id') // Loại trừ cột 'id' để không cập nhật
					.map((col) => `${col} = EXCLUDED.${col}`) // Sử dụng EXCLUDED để tham chiếu giá trị mới
					.join(', ')}
    RETURNING *;
`;

			const params = [...validColumns.map((column) => client[column])];
			const result = await repoClient.query(query, params);

			/** 3. Update cache */
			if (result && Array.isArray(result.rows) && result.rows.length > 0) {
				const client = {
					...result.rows[0],
					className: 'Client',
				};
				cache.clients[client.id] = {
					cached_at: Date.now(),
					value: client,
				};
				return cache.clients[client.id].value;
			}

			return client;
		}
		throw new Error(`Invalid client: ${client}`);
	} catch (error) {
		handleError(error, 'newClient');
	}

	function validateClient(client) {
		if (
			typeof client === 'object' &&
			Object.keys(client).length > 0
			// &&
			// client.id === undefined &&
			// client.client_name.trim().length > 0
		) {
			return true;
		}
		return false;
	}
}

async function newTestOrder(testOrder) {
	/**
	 * @param {Object} testOrder
	 * @returns {Promise<Object>}
	 */
	try {
		if (validateTestOrder(testOrder)) {
			/** 1. Validate test order columns */
			const validColumns = await matchValidColumns('test_order', Object.keys(testOrder));
			if (validColumns.length === 0)
				throw new Error(`Invalid test order columns: ${Object.keys(testOrder).join(', ')}`);

			/** 2. Send to server */
			// Tạo câu truy vấn động với ON CONFLICT
			const query = `
    INSERT INTO test_order (${validColumns.join(',')}) 
    VALUES (${validColumns.map((_, index) => `$${index + 1}`).join(',')})
    ON CONFLICT (id) 
    DO UPDATE SET 
    ${validColumns
					.filter((col) => col !== 'id') // Loại trừ cột 'id' vì không cần cập nhật
					.map((col) => `${col} = EXCLUDED.${col}`) // Cập nhật các cột khác
					.join(', ')}
    RETURNING *;
`;

			const params = [...validColumns.map((column) => testOrder[column])];
			const result = await repoClient.query(query, params);

			/** 3. Update cache */
			if (result && Array.isArray(result.rows) && result.rows.length > 0) {
				const testOrder = {
					...result.rows[0],
					className: 'TestOrder',
				};
				cache.testOrder[testOrder.id] = {
					cached_at: Date.now(),
					value: testOrder,
				};
				return cache.testOrder[testOrder.id].value;
			}
			return result;
		}
	} catch (error) {
		handleError(error, 'newTestOrder');
	}

	function validateTestOrder(testOrder) {
		if (
			typeof testOrder === 'object' &&
			Object.keys(testOrder).length > 0
			// && testOrder.id === undefined
		) {
			return true;
		}
		return false;
	}
}

async function newUser(user) {
	/**
	 * @param {Object} user
	 * @returns {Promise<Object>}
	 */
	try {
		if (validateUser(user)) {
			/** 1. Validate user columns */
			const validColumns = await matchValidColumns('users', Object.keys(user));
			if (validColumns.length === 0) throw new Error(`Invalid user columns: ${Object.keys(user).join(', ')}`);

			/** 2. Send to server */
			const query = `
                    INSERT INTO users (${validColumns.join(',')}) 
                    VALUES ( ${validColumns.map((_, index) => `$${index + 1}`).join(',')})
                                    RETURNING *
                `;
			const params = [...validColumns.map((column) => user[column])];
			const result = await repoClient.query(query, params);

			/** 3. Update cache */
			if (result && Array.isArray(result.rows) && result.rows.length > 0) {
				const user = {
					...result.rows[0],
					className: 'User',
				};
				cache.users[user.id] = {
					cached_at: Date.now(),
					value: user,
				};
				return cache.users[user.id].value;
			}
			return result;
		}
	} catch (error) {
		handleError(error, 'newUser');
	}

	function validateUser(user) {
		if (
			typeof user === 'object'
			// && Object.keys(user).length > 0
			// && user.id === undefined
		) {
			return true;
		}
		return false;
	}
}

async function newReceiptPrice(receiptPrice) {
	/**
	 * @param {Object} receiptPrice
	 * @returns {Promise<Object>}
	 */
	try {
		if (validateReceiptPrice(receiptPrice)) {
			/** 1. Validate receipt price columns */
			const validColumns = await matchValidColumns('receipt_prices', Object.keys(receiptPrice));
			if (validColumns.length === 0)
				throw new Error(`Invalid test order columns: ${Object.keys(receiptPrice).join(', ')}`);
			// Tạo câu truy vấn động với ON CONFLICT
			const query = `
				INSERT INTO receipt_prices (${validColumns.join(',')}) 
				VALUES (${validColumns.map((_, index) => `$${index + 1}`).join(',')})
				ON CONFLICT (id) 
				DO UPDATE SET 
				${validColumns
					.filter((col) => col !== 'id') // Loại trừ cột 'id' vì không cần cập nhật
					.map((col) => `${col} = EXCLUDED.${col}`) // Cập nhật các cột còn lại
					.join(', ')}
				RETURNING *;
			`;

			const params = [...validColumns.map((column) => receiptPrice[column])];
			const result = await repoClient.query(query, params);

			if (result && Array.isArray(result.rows) && result.rows.length > 0) {
				const insertReceiptPrice = {
					...result.rows[0],
					className: 'ReceiptPrice',
				};
				cache.receiptPrices[insertReceiptPrice.id] = {
					cached_at: Date.now(),
					value: receiptPrice,
				};
				return cache.receiptPrices[insertReceiptPrice.id].value;
			}
			return result.rows[0];
		}
	} catch (error) {
		handleError(error, 'newReceiptPrice');
	}

	function validateReceiptPrice(receiptPrice) {
		if (
			typeof receiptPrice === 'object' &&
			Object.keys(receiptPrice).length > 0
			// && receiptPrice.id === undefined
		) {
			return true;
		}
		return false;
	}
}

async function newLibProtocol(libProtocols) {
	try {
		if (validateLibProtocols(libProtocols)) {
			const validColumns = await matchValidColumns('lib_protocols', Object.keys(libProtocols));
			if (validColumns.length === 0)
				throw new Error(`Invalid test order columns: ${Object.keys(libProtocols).join(', ')}`);
			// Tạo câu truy vấn với ON CONFLICT
			const query = `
    INSERT INTO lib_protocols (${validColumns.join(',')}) 
    VALUES (${validColumns.map((_, index) => `$${index + 1}`).join(',')})
    ON CONFLICT (id) 
    DO UPDATE SET 
    ${validColumns
					.filter((col) => col !== 'id') // Bỏ qua cột 'id' để không cập nhật
					.map((col) => `${col} = EXCLUDED.${col}`) // Sử dụng EXCLUDED để tham chiếu giá trị mới
					.join(', ')}
    RETURNING *;
`;

			const params = [...validColumns.map((column) => libProtocols[column])];
			const result = await repoClient.query(query, params);
			if (result && Array.isArray(result.rows) && result.rows.length > 0) {
				const libProtocols = {
					...result.rows[0],
					className: 'LibProtocol',
				};
				cache.libProtocols[libProtocols.id] = {
					cached_at: Date.now(),
					value: libProtocols,
				};
				return cache.libProtocols[libProtocols.id].value;
			}
			return result;
		}
	} catch (error) {
		handleError(error, 'newLibProtocol');
	}

	function validateLibProtocols(libProtocols) {
		if (
			typeof libProtocols === 'object'
			// && Object.keys(libProtocols).length > 0
			// && libProtocols.id === undefined
		) {
			return true;
		}
		return false;
	}
}

async function newLibDept(libDept) {
	try {
		if (validateLibDept(libDept)) {
			const validColumns = await matchValidColumns('lib_dept', Object.keys(libDept));
			if (validColumns.length === 0) throw new Error(`Invalid test order columns: ${Object.keys(libDept).join(', ')}`);
			// Tạo câu truy vấn với ON CONFLICT
			const query = `
    INSERT INTO lib_dept (${validColumns.join(',')}) 
    VALUES (${validColumns.map((_, index) => `$${index + 1}`).join(',')})
    ON CONFLICT (id) 
    DO UPDATE SET 
    ${validColumns
					.filter((col) => col !== 'id') // Loại trừ cột 'id' để không cập nhật
					.map((col) => `${col} = EXCLUDED.${col}`) // Cập nhật các cột còn lại từ EXCLUDED
					.join(', ')}
    RETURNING *;
`;

			const params = [...validColumns.map((column) => libDept[column])];
			const result = await repoClient.query(query, params);
			if (result && Array.isArray(result.rows) && result.rows.length > 0) {
				const libDept = {
					...result.rows[0],
					className: 'LibDept',
				};
				cache.libDept[libDept.id] = {
					cached_at: Date.now(),
					value: libDept,
				};
				return cache.libDept[libDept.id].value;
			}
			return result;
		}
	} catch (error) {
		handleError(error, 'newLibDept');
	}

	function validateLibDept(libDept) {
		if (
			typeof libDept === 'object'
			// && Object.keys(libDept).length > 0 &&
			// libDept.id === undefined
		) {
			return true;
		}
		return false;
	}
}

async function newLibLab(libLab) {
	try {
		if (validateLibLab(libLab)) {
			const validColumns = await matchValidColumns('lib_lab', Object.keys(libLab));
			if (validColumns.length === 0) throw new Error(`Invalid test order columns: ${Object.keys(libLab).join(', ')}`);
			const query = `
                    INSERT INTO lib_lab (${validColumns.join(',')}) 
                    VALUES ( ${validColumns.map((_, index) => `$${index + 1}`).join(',')})
                                    RETURNING *
                `;
			const params = [...validColumns.map((column) => libLab[column])];
			const result = await repoClient.query(query, params);
			if (result && Array.isArray(result.rows) && result.rows.length > 0) {
				const libLab = {
					...result.rows[0],
					className: 'LibLab',
				};
				cache.libLab[libLab.id] = {
					cached_at: Date.now(),
					value: libLab,
				};
				return cache.libLab[libLab.id].value;
			}
			return result;
		}
	} catch (error) {
		handleError(error, 'newLibLab');
	}

	function validateLibLab(libLab) {
		if (
			typeof libLab === 'object'
			// && Object.keys(libLab).length > 0 &&
			// libLab.id === undefined
		) {
			return true;
		}
		return false;
	}
}

async function newSamplePrice(samplePrices) {
	try {
		if (validateSamplePrices(samplePrices)) {
			const validColumns = await matchValidColumns('sample_prices', Object.keys(samplePrices));
			if (validColumns.length === 0)
				throw new Error(`Invalid test order columns: ${Object.keys(samplePrices).join(', ')}`);
			const query = `
			INSERT INTO sample_prices (${validColumns.join(',')}) 
			VALUES (${validColumns.map((_, index) => `$${index + 1}`).join(',')})
			ON CONFLICT (id) 
			DO UPDATE SET 
			${validColumns
					.filter((col) => col !== 'id') // Loại trừ cột 'id' để không cập nhật
					.map((col) => `${col} = EXCLUDED.${col}`) // Cập nhật các cột còn lại từ EXCLUDED
					.join(', ')}
			RETURNING *;
		`;
			const params = [...validColumns.map((column) => samplePrices[column])];
			let result = await repoClient.query(query, params);

			if (result && Array.isArray(result.rows) && result.rows.length > 0) {
				const samplePrices = {
					...result.rows[0],
					className: 'SamplePrice',
				};
				cache.samplePrices[samplePrices.id] = {
					cached_at: Date.now(),
					value: samplePrices,
				};
				return cache.samplePrices[samplePrices.id].value;
			}
			return result.rows[0];
		}
	} catch (error) {
		handleError(error, 'newSamplePrice');
	}

	function validateSamplePrices(samplePrices) {
		if (
			typeof samplePrices === 'object' &&
			Object.keys(samplePrices).length > 0
			// && samplePrices.id === undefined
		) {
			return true;
		}
		return false;
	}
}

async function newSampleReport(sampleReport) {
	try {
		if (validateSampleReport(sampleReport)) {
			// if (sampleReport.id) delete sampleReport.id;
			// CHECK
			if (!sampleReport.report_uid) sampleReport.report_uid = await nextSampleReportUID();
			const validColumns = await matchValidColumns('sample_report', Object.keys(sampleReport));
			if (validColumns.length === 0)
				throw new Error(`Invalid test order columns: ${Object.keys(sampleReport).join(', ')}`);
			// Tạo câu truy vấn với ON CONFLICT
			const query = `
    INSERT INTO sample_report (${validColumns.join(',')}) 
    VALUES (${validColumns.map((_, index) => `$${index + 1}`).join(',')})
    ON CONFLICT (id) 
    DO UPDATE SET 
    ${validColumns
					.filter((col) => col !== 'id') // Loại trừ cột 'id' để không cập nhật
					.map((col) => `${col} = EXCLUDED.${col}`) // Cập nhật các cột còn lại từ EXCLUDED
					.join(', ')}
    RETURNING *;
`;

			const params = [...validColumns.map((column) => sampleReport[column])];
			const result = await repoClient.query(query, params);

			if (result && Array.isArray(result.rows) && result.rows.length > 0) {
				const sampleReport = {
					...result.rows[0],
					className: 'SampleReport',
				};
				cache.sampleReports[sampleReport.id] = {
					cached_at: Date.now(),
					value: sampleReport,
				};
				return cache.sampleReports[sampleReport.id].value;
			}
			return result;
		}
	} catch (error) {
		handleError(error, 'newSampleReport');
	}

	function validateSampleReport(sampleReport) {
		if (
			typeof sampleReport === 'object' &&
			Object.keys(sampleReport).length > 0
			//  && sampleReport.id === undefined
		) {
			return true;
		}
		return false;
	}

	async function nextSampleReportUID() {
		// Get current day, week and year
		const currentDate = new Date();
		const currentYear = currentDate.getFullYear().toString().slice(-2);
		const currentWeek = String(
			Math.floor(
				(currentDate.getTime() - new Date(currentDate.getFullYear(), 0, 1).getTime()) / (1000 * 60 * 60 * 24 * 7),
			) + 1,
		).padStart(2, '0');
		const currentDay = String(currentDate.getDate()).padStart(2, '0');
		const currentMonth = String(currentDate.getMonth() + 1).padStart(2, '0');

		// Get next receipt UID
		const query = `SELECT report_uid FROM sample_report ORDER BY id DESC LIMIT 1`;
		const result = await repoClient.query(query);
		const lastUID = result.rows[0].report_uid || 'PPT.YYWWMM-DD01';
		const nextIndex =
			lastUID.slice(6, 8) !== currentWeek ? '01' : String(Number(lastUID.slice(12)) + 1).padStart(2, '0');
		const nextReceiptUID = `PPT.${currentYear}${currentWeek}${currentMonth}-${currentDay}${nextIndex}`;

		return nextReceiptUID;
	}
}

async function newSampleReportTest(sampleReportTest) {
	try {
		if (validateSampleReportTest(sampleReportTest)) {
			const validColumns = await matchValidColumns('sample_report_tests', Object.keys(sampleReportTest));
			if (validColumns.length === 0)
				throw new Error(`Invalid test order columns: ${Object.keys(sampleReportTest).join(', ')}`);
			// Tạo câu truy vấn với ON CONFLICT
			const query = `
    INSERT INTO sample_report_tests (${validColumns.join(',')}) 
    VALUES (${validColumns.map((_, index) => `$${index + 1}`).join(',')})
    ON CONFLICT (id) 
    DO UPDATE SET 
    ${validColumns
					.filter((col) => col !== 'id') // Loại trừ cột 'id' để không cập nhật
					.map((col) => `${col} = EXCLUDED.${col}`) // Cập nhật các cột còn lại từ EXCLUDED
					.join(', ')}
    RETURNING *;
`;

			const params = [...validColumns.map((column) => sampleReportTest[column])];
			const result = await repoClient.query(query, params);
			if (result && Array.isArray(result.rows) && result.rows.length > 0) {
				const sampleReportTest = {
					...result.rows[0],
					className: 'SampleReportTest',
				};
				cache.sampleReportTest[sampleReportTest.id] = {
					cached_at: Date.now(),
					value: sampleReportTest,
				};
				return cache.sampleReportTest[sampleReportTest.id].value;
			}
			return result;
		}
	} catch (error) {
		handleError(error, 'newSampleReportTest');
	}

	function validateSampleReportTest(sampleReportTest) {
		if (
			typeof sampleReportTest === 'object' &&
			Object.keys(sampleReportTest).length > 0
			// &&	sampleReportTest.id === undefined
		) {
			return true;
		}
		return false;
	}
}

async function newLabRole(labRole) {
	try {
		if (validateLabRole(labRole)) {
			const validColumns = await matchValidColumns('user_lab_roles', Object.keys(labRole));
			if (validColumns.length === 0)
				throw new Error(`Invalid User Lab Role columns: ${Object.keys(labRole).join(', ')}`);
			const query = `
                    INSERT INTO user_lab_roles (${validColumns.join(',')}) 
                    VALUES ( ${validColumns.map((_, index) => `$${index + 1}`).join(',')})
                                    RETURNING *
                `;
			const params = [...validColumns.map((column) => labRole[column])];
			const result = await repoClient.query(query, params);
			if (result && Array.isArray(result.rows) && result.rows.length > 0) {
				const labRole = {
					...result.rows[0],
					className: 'LabRole',
				};
				cache.labRole[labRole.id] = {
					cached_at: Date.now(),
					value: labRole,
				};
				return cache.labRole[labRole.id].value;
			}
			return result;
		}
	} catch (error) {
		handleError(error, 'newLabRole');
	}

	function validateLabRole(labRole) {
		if (
			typeof labRole === 'object' &&
			Object.keys(labRole).length > 0
			// && labRole.id === undefined
		) {
			return true;
		}
		return false;
	}
}

async function newUserDept(userDept) {
	try {
		if (validateUserDept(userDept)) {
			const validColumns = await matchValidColumns('user_depts', Object.keys(userDept));
			if (validColumns.length === 0) throw new Error(`Invalid User Dept columns: ${Object.keys(userDept).join(', ')}`);
			const query = `
                    INSERT INTO user_depts (${validColumns.join(',')}) 
                    VALUES ( ${validColumns.map((_, index) => `$${index + 1}`).join(',')})				
                    RETURNING *

                `;
			const params = [...validColumns.map((column) => userDept[column])];
			const result = await repoClient.query(query, params);
			if (result && Array.isArray(result.rows) && result.rows.length > 0) {
				const userDept = {
					...result.rows[0],
					className: 'UserDept',
				};
				cache.userDept[userDept.id] = {
					cached_at: Date.now(),
					value: userDept,
				};
				return cache.userDept[userDept.id].value;
			}
			return result;
		}
	} catch (error) {
		handleError(error, 'newUserDept');
	}

	function validateUserDept(userDept) {
		if (
			typeof userDept === 'object' &&
			Object.keys(userDept).length > 0
			// && userDept.id === undefined
		) {
			return true;
		}
		return false;
	}
}

function handleError(error, functionName) {
	node.warn(`[ CAUGHT ERROR ] @layer0.js  ${functionName}() - ${JSON.stringify(error)}`);
	node.warn(error);
	// API response
	error.statusCode = 500; // Internal Server Error
	error.errorMessage = 'Internal Server Error';
	throw error;
}

//export functions
const layer0 = {
	getReceipt,
	setReceipt,
	getSample,
	setSample,
	getTest,
	setTest,
	getClient,
	getProtocol,
	getReceiptPrice,
	getTestOrder,
	getSampleReport,
	getSampleReportTest,
	getUser,
	newClient,
	setClient,
	newReceipt,
	newTest,
	newSample,
	newTestOrder,
	newUser,
	newReceiptPrice,
	newLibProtocol,
	newLibDept,
	newLibLab,
	newSamplePrice,
	newLabRole,
	newUserDept,
	delReceipt,
	delSample,
	delTest,
	delClient,
	delTestOrder,
	delProtocol,
	delReceiptPrice,
	setReceiptPrice,
	setTestOrder,
	setProtocol,
	setSampleReport,
	setSampleReportTest,
	newSampleReport,
	newSampleReportTest,
    getAllReceipts,
    getAllSamples,
    getAllTestOrders,
};

global.set('layer0', layer0);

global.set('bcrypt', bcrypt);

return msg;
