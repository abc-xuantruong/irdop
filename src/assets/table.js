const postgreSQL = global.get('postgreSQL');
const cache = global.get('cache');

class Receipt {
	static async get({ id, receipt_uid }) {
		let receipt = cache.getReceipt(id);
		if (!receipt) {
			receipt = (await postgreSQL.getReceipt({ id, receipt_uid })) || {};
			cache.setReceipt(receipt);
		}
		return receipt;
	}

	static async getAll() {
		const receipts = (await postgreSQL.getAllReceipt()) || [];
		// cache.setAllReceipt(receipts);
		return receipts;
	}

	static async getRecentReceipt() {
		const receiptIds = (await postgreSQL.recentReceipt()) || [];
		const receipts = await Promise.all(
			receiptIds.map(async (receipt) => {
				return await Receipt.getReceiptFull({ id: receipt.id });
			}),
		);
		return receipts;
	}

	static async getReceiptFull({ id, receipt_uid }) {
		const fromCache = cache.getReceiptFull(id);
		if (fromCache) {
			return fromCache;
		} else {
			let receiptFull = await Receipt.get({ id, receipt_uid });
			let samples = (await Sample.getByReceipt({ id, receipt_uid })) || [];
			let analysis = [];

			for (let i = 0; i < samples.length; i++) {
				analysis[i] = (await postgreSQL.getAnalysisBySample({ id: samples[i].id })) || [];
				const ppt_uids = (await postgreSQL.getPptUidBySampleUid({ sample_uid: samples[i].sample_uid })) || [];
				samples[i].analysis = analysis[i];
				samples[i].report = ppt_uids;
			}

			receiptFull = { ...receiptFull, samples: samples };
			cache.setReceiptFull(receiptFull);

			return receiptFull;
		}
	}

	static async getByClient({ client_id }) { }

	static async create(receipt) {
		const newReceipt = (await postgreSQL.createReceipt(receipt)) || {};
		cache.setReceipt(newReceipt);
		node.warn(newReceipt);
		return newReceipt;
	}

	static async search(query) {
		const receiptIds = (await postgreSQL.searchReceipt(query)) || [];
		const receipts = await Promise.all(
			receiptIds.map(async (receipt) => {
				return await Receipt.getReceiptFull({ id: receipt.id });
			}),
		);
		return receipts;
	}

	static async update(receipt) {
		const updatedReceipt = (await postgreSQL.updateReceipt(receipt)) || {};
		cache.setReceipt(updatedReceipt);
		return updatedReceipt;
	}

	static async delete(id) {
		const result = (await postgreSQL.deleteReceipt(id)) || {};
		cache.delReceipt(id);
		return result;
	}
}

class Sample {
	static async get({ id, sample_uid }) {
		let sample = cache.getSample(id);
		if (!sample) {
			sample = (await postgreSQL.getSample({ id, sample_uid })) || {};
			cache.setSample(sample);
		}
		return sample;
	}

	static async getAll() { 
		const samples = (await postgreSQL.getAllSample()) || [];
		// cache.setAllReceipt(receipts);
		return samples;
	}

	static async getSampleFull({ id, sample_uid }) {
		const sample = await Sample.get({ id, sample_uid });
		const analysis = (await postgreSQL.getAnalysisBySample({ id, sample_uid })) || [];
		const receipt = await Receipt.get({id:sample.receipt_id});        
		const ppt_uids = (await postgreSQL.getPptUidBySampleUid({ id, sample_uid })) || [];
		const sampleFull = { ...sample, analysis: analysis, receipt:receipt, report: ppt_uids};
		return sampleFull;
	}

	static async getByReceipt({ id, receipt_uid }) {
		const samples = (await postgreSQL.getSampleByReceipt({ id, receipt_uid })) || [];
		return samples;
	}

	static async getProcessingSample() { }

	static async getProcessingSampleByTechnician({ technician_uid }) { }

	static async create(sample) {
		const newSample = (await postgreSQL.createSample(sample)) || {};
		cache.setSample(newSample);
		return newSample;
	}

	static async update(sample) {
		const updatedSample = (await postgreSQL.updateSample(sample)) || {};
		cache.setSample(updatedSample);
		return updatedSample;
	}

	static async delete(id) {
		const result = (await postgreSQL.deleteSample(id)) || {};
		cache.delSample(id);
		return result;
	}

	static async createReport(report) {
		const newReport = (await postgreSQL.createReport(report)) || {};
		return newReport;
	}

    static async upsertDraftReport(report){
        const newDraftReport = (await postgreSQL.upsertDraftReport(report)) || {};
        return newDraftReport;
    }

	static async getReport({ id,ppt_uid }) {
		const report = (await postgreSQL.getReport({ id,ppt_uid })) || {};
		return report;
	}

	static async getPptUidBySampleUid({ id, sample_uid }) {
		const ppt_uids = (await postgreSQL.getPptUidBySampleUid({ id, sample_uid })) || [];
		return ppt_uids;
	}
}

class Analysis {
	static async get({ id }) {
		let analysis = cache.getAnalysis(id);
		if (!analysis) {
			analysis = (await postgreSQL.getAnalysis({ id })) || {};
			cache.setAnalysis(analysis);
		}
		return analysis;
	}

	static async getAll() {
		const analysis = (await postgreSQL.getAllAnalysis()) || [];
		return analysis;
	}

	static async getBySample({ id, sample_uid }) {
		const analysis = (await postgreSQL.getAnalysisBySample({ id, sample_uid })) || [];
		return analysis;
	}

	static async getByReceipt({ id, receipt_uid }) {
		const analysis = (await postgreSQL.getAnalysisByReceipt({ id, receipt_uid })) || [];
		return analysis;
	}

	static async getTemporaryAnalysis() {
		// Implement if needed
	}

	static async create(analysis) {
		const newAnalysis = (await postgreSQL.createAnalysis(analysis)) || {};
		cache.setAnalysis(newAnalysis);
		return newAnalysis;
	}

	static async createBulkFromParameters(analysis) {
		try {
			const newanalysis = (await postgreSQL.createBulkAnalysisFromParameters(analysis)) || [];
			// newanalysis.forEach((analysis) => cache.setAnalysis(analysis));
			return newanalysis;
		} catch (error) {
			node.warn(error);
		};
	}
	

	static async update(analysis) {
		const updatedAnalysis = (await postgreSQL.updateAnalysis(analysis)) || {};
		cache.setAnalysis(updatedAnalysis);
		return updatedAnalysis;
	}

	static async delete({id,ids}) {
		const result = (await postgreSQL.deleteAnalysis({id,ids})) || {};
		if(ids){
		    ids.map(i =>cache.delAnalysis(i))
		}else{
		    cache.delAnalysis(id);
		}
		return result;
	}
}

class Client {
	static async get({ id, client_uid }) {
		let client = cache.getClient(id);
		if (!client) {
			client = (await postgreSQL.getClient({ id, client_uid })) || {};
			cache.setClient(client);
		}
		return client;
	}

	static async getAll() {
		const clients = (await postgreSQL.getAllClient()) || [];
		return clients;
	}

	static async getTemporaryClient() {
		const clients = (await postgreSQL.getTemporaryClient()) || [];
		return clients;
	}

	static async getTemporaryContact() {
		const contacts = (await postgreSQL.getTemporaryContact()) || [];
		return contacts;
	}

	static async create(client) {
		const newClient = (await postgreSQL.createClient(client));
		cache.setClient(newClient);
		return newClient;
	}

	static async update(client) {
		const updatedClient = (await postgreSQL.updateClient(client)) || {};
		cache.setClient(updatedClient);
		return updatedClient;
	}

	static async delete(id) {
		const result = (await postgreSQL.deleteClient(id)) || {};
		cache.delClient(id);
		return result;
	}

	static async updatedTemporaryClient(client) {
		const updatedClient = (await postgreSQL.updateTemporaryClient(client)) || {};
		cache.setClient(updatedClient);
		return updatedClient;
	}
	
	static async getClientByReceipt({id, receipt_uid}){
		const client = (await postgreSQL.getClientByReceipt({id, receipt_uid})) || {};
		return client;
	}
}

class Parameter {
	static async get({ id, uid }) {
	    let parameter;
	    if(id) {
	        parameter = cache.getParameter(id);
	    }
		if (!parameter) {
			parameter = (await postgreSQL.getParameter({id, uid})) || {};
			cache.setParameter(parameter);
		}
		return parameter;
	}
		
	static async upsertParameterByUid(analysis) {
		const updatedAnalysis = (await postgreSQL.upsertParameterByUid(analysis)) || {};
		cache.setAnalysis(updatedAnalysis);
		return updatedAnalysis;
	}

	static async getBulk({ids, uids}) {
		const parameters = (await postgreSQL.getBulkParameter({ids,uids})) || [];
		return parameters;
	}

	static async getAll() {
		const parameters = (await postgreSQL.getAllParameters()) || [];
		return parameters;
	}

	static async getByProtocolId(protocol_id) {
		const parameters = (await postgreSQL.getParametersByProtocolId(protocol_id)) || [];
		return parameters;
	}

	static async create(parameter) {
		const newParameter = (await postgreSQL.createParameter(parameter)) || {};
		cache.setParameter(newParameter);
		return newParameter;
	}

	static async update(parameter) {
		const updatedParameter = (await postgreSQL.updateParameter(parameter)) || {};
		cache.setParameter(updatedParameter);
		return updatedParameter;
	}

	static async delete(id) {
		const result = (await postgreSQL.deleteParameter(id)) || {};
		cache.delParameter(id);
		return result;
	}

	static async createBulk(parameters) {
		const newParameters = (await postgreSQL.createBulkParameters(parameters)) || [];
		newParameters.forEach((parameter) => cache.setParameter(parameter));
		return newParameters;
	}

	static async search(query, matrix = null) {
		const parameters = (await postgreSQL.searchParameter(query, matrix)) || [];
		return parameters;
	}
}

class Protocol {
	static async get({ id }) {
		let protocol = cache.getProtocol(id);
		if (!protocol) {
			protocol = (await postgreSQL.getProtocolById(id)) || {};
			cache.setProtocol(protocol);
		}
		return protocol;
	}

	static async getAll() {
		const protocols = (await postgreSQL.getAllProtocols()) || [];
		return protocols;
	}

	static async create(protocol) {
		const newProtocol = (await postgreSQL.createProtocol(protocol)) || {};
		cache.setProtocol(newProtocol);
		return newProtocol;
	}

	static async update(protocol) {
		const updatedProtocol = (await postgreSQL.updateProtocol(protocol)) || {};
		cache.setProtocol(updatedProtocol);
		return updatedProtocol;
	}

	static async delete(id) {
		const result = (await postgreSQL.deleteProtocol(id)) || {};
		cache.delProtocol(id);
		return result;
	}
}

const table = {
	Receipt,
	Analysis,
	Sample,
	Client,
	Parameter,
	Protocol,
};

global.set('table', table);

return msg;
