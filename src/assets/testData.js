const cache = {
	// Cache storage objects
	receipt: {},
	receiptFull: {},
	sample: {},
	client: {},
	processingSamples: {},
	analysis: {},
	protocol: {},
	parameter: {},
	noti_payment: {},
	misaHook: {},
	identity: {},
	payment: {},

	// Generic cache handlers
	set: (type, item, max_age = 60 * 60 * 1000) => {
		if (!cache[type]) throw new Error(`Invalid cache type: ${type}`);

		cache[type][item.id] = {
			value: item,
			cached_at: Date.now(),
			max_age: max_age,
		};
	},

	get: (type, id, age_limit) => {
		if (!cache[type]) throw new Error(`Invalid cache type: ${type}`);
		if (!cache[type][id]) return null;

		const item = cache[type][id];
		age_limit = age_limit || item.max_age;

		if (item.cached_at + age_limit < Date.now()) {
			delete cache[type][id];
			return null;
		}
		return item.value;
	},

	setAll: (type, items, max_age = 60 * 60 * 1000) => {
		if (!cache[type]) throw new Error(`Invalid cache type: ${type}`);
		items.forEach((item) => {
			cache[type][item.id] = {
				value: item,
				cached_at: Date.now(),
				max_age: max_age,
			};
		});
	},

	// Convenience methods
	setAllReceipts: (receipts, max_age) => cache.setAll('receipt', receipts, max_age),
	setReceipt: (receipt, max_age) => {
		cache.set('receipt', receipt, max_age);
		// Sync with receiptFull if it exists
		const receiptFull = cache.receiptFull[receipt.id];
		if (receiptFull) {
			// Update receipt data while preserving samples and other specific receiptFull data
			receiptFull.value = {
				...receiptFull.value,
				...receipt,
				// Preserve samples array if it exists
				samples: receiptFull.value.samples || [],
			};
			receiptFull.cached_at = Date.now();
		}
	},
	getReceipt: (id, age_limit) => cache.get('receipt', id, age_limit),
	delReceipt: (id) => {
		delete cache.receipt[id];
		delete cache.receiptFull[id]; // Also delete the corresponding receiptFull
	},

	setReceiptFull: (receipt, max_age) => cache.set('receiptFull', receipt, max_age),
	getReceiptFull: (id, age_limit) => cache.get('receiptFull', id, age_limit),
	delReceiptFull: (id) => delete cache.receiptFull[id],

	setAllSamples: (samples, max_age) => cache.setAll('sample', samples, max_age),
	setSample: (sample, max_age) => {
		cache.set('sample', sample, max_age);
		const receiptFull = cache.receiptFull[sample.receipt_id];
		if (receiptFull) {
			const sampleIndex = receiptFull.value.samples.findIndex((s) => s.id === sample.id);
			if (sampleIndex !== -1) {
				receiptFull.value.samples[sampleIndex] = {
					...receiptFull.value.samples[sampleIndex],
					...sample,
				};
			} else {
				receiptFull.value.samples.push(sample);
			}
		}
	},
	getSample: (id, age_limit) => cache.get('sample', id, age_limit),
	delSample: (id) => {
		const sample = cache.sample[id];
		if (sample) {
			const receiptFull = cache.receiptFull[sample.receipt_id];
			if (receiptFull) {
				const sampleIndex = receiptFull.value.samples.findIndex((s) => s.id === id);
				if (sampleIndex !== -1) {
					receiptFull.value.samples.splice(sampleIndex, 1);
				}
			}
		}
		delete cache.sample[id];
	},

	setSampleFull: (sample, max_age) => cache.set('sampleFull', sample, max_age),
	getSampleFull: (id, age_limit) => cache.get('sampleFull', id, age_limit),
	delSampleFull: (id) => delete cache.sampleFull[id],

	setClient: (client, max_age) => cache.set('client', client, max_age),
	getClient: (id, age_limit) => cache.get('client', id, age_limit),
	delClient: (id) => delete cache.client[id],

	setAnalysis: (analysis, max_age) => {
		cache.set('analysis', analysis, max_age);

		// Update receiptFull if it exists
		const receiptFull = cache.receiptFull[analysis.receipt_id];
		if (receiptFull && receiptFull.value.samples) {
			const sampleFull = receiptFull.value.samples.find((s) => s.id === analysis.sample_id);
			if (sampleFull) {
				// Initialize analysis array if it doesn't exist
				if (!sampleFull.analysis) {
					sampleFull.analysis = [];
				}
				const analysisIndex = sampleFull.analysis.findIndex((a) => a.id === analysis.id);
				if (analysisIndex !== -1) {
					sampleFull.analysis[analysisIndex] = analysis;
				} else {
					sampleFull.analysis.push(analysis);
				}
			}
		}
	},
	getAnalysis: (id, age_limit) => cache.get('analysis', id, age_limit),
	delAnalysis: (id) => {
		const analysis = cache.analysis[id];
		if (analysis) {
			const sample = cache.sample[analysis.sample_id];
			if (sample) {
				const analysisIndex = sample.analysis.findIndex((a) => a.id === id);
				if (analysisIndex !== -1) {
					sample.analysis.splice(analysisIndex, 1);
				}
			}
			const receiptFull = cache.receiptFull[analysis.receipt_id];
			if (receiptFull && receiptFull.value.samples) {
				const sampleFull = receiptFull.value.samples.find((s) => s.id === analysis.sample_id);
				if (sampleFull) {
					const analysisIndex = sampleFull.analysis.findIndex((a) => a.id === id);
					if (analysisIndex !== -1) {
						sampleFull.analysis.splice(analysisIndex, 1);
					}
				}
			}
		}
		delete cache.analysis[id];
	},

	setProtocol: (protocol, max_age) => cache.set('protocol', protocol, max_age),
	getProtocol: (id, age_limit) => cache.get('protocol', id, age_limit),
	delProtocol: (id) => delete cache.protocol[id],

	setParameter: (parameter, max_age) => cache.set('parameter', parameter, max_age),
	getParameter: (id, age_limit) => cache.get('parameter', id, age_limit),
	delParameter: (id) => delete cache.parameter[id],

	getIdentity: (identity_uid, age_limit = 5 * 24 * 60 * 60 * 1000) => {
		if (!cache['identity']) throw new Error(`Invalid cache type: identity`);
		if (!cache['identity'][identity_uid]) return null;

		const item = cache['identity'][identity_uid];
		age_limit = age_limit || item.max_age;

		if (item.cached_at + age_limit < Date.now()) {
			delete cache['identity'][identity_uid];
			return null;
		}
		return item.value;
	},

	setAllIdentity: (identity, max_age = 24 * 60 * 60 * 1000) => {
		node.warn(identity);
		if (!cache['identity']) throw new Error(`Invalid cache type: ${identity}`);
		identity.forEach((item) => {
			cache['identity'][item.identity_uid] = {
				value: item,
				cached_at: Date.now(),
				max_age: max_age,
			};
		});
	},

	// Notification payment methods with 20h default expiration
	setNotiPayment: (noti_payment, max_age = 4 * 60 * 60 * 1000) => cache.set('noti_payment', noti_payment, max_age),
	getNotiPayment: (age_limit = 20 * 60 * 60 * 1000) => {
		const result = [];
		const now = Date.now();

		// Iterate through all notification payments
		for (const id in cache.noti_payment) {
			const item = cache.noti_payment[id];

			// Check if item is expired
			if (item.cached_at + (age_limit || item.max_age) < now) {
				// Remove expired items
				delete cache.noti_payment[id];
			} else {
				// Add valid items to result
				result.push(item.value);
			}
		}

		return result;
	},
	delNotiPayment: (id) => {
		node.warn(id);
		delete cache.noti_payment[id];
	},

	// Payment methods
	setPayment: (item, max_age = 24 * 60 * 60 * 1000) => {
		if (!item.order_code) throw new Error('order_code is required for payment');

		const key = item.order_code.slice(-4); // 4 ký tự cuối của order_code
		cache.payment[key] = {
			value: item,
			cached_at: Date.now(),
			max_age: max_age,
		};
	},

	getPayment: (type, order_code, age_limit) => {
		if (!order_code) return null;

		const key = order_code.slice(-4); // 4 ký tự cuối của order_code
		if (!cache.payment[key]) return null;

		const item = cache.payment[key];
		age_limit = age_limit || item.max_age;

		if (item.cached_at + age_limit < Date.now()) {
			delete cache.payment[key];
			return null;
		}
		return item.value;
	},

	delPayment: (order_code) => {
		if (!order_code) return;

		const key = order_code.slice(-4); // 4 ký tự cuối của order_code
		delete cache.payment[key];
	},
};

// Export Cache to global
global.set('cache', cache);
return msg;
