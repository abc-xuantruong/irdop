const { GoogleGenAI, ContentListUnion, createPartFromUri } = global.get('genai');
const { session, UniFile } = global.get('entities.js');
const { LimsPools, s3Clients } = global.get('services.js');
const { cError, handleError } = global.get('utilities.js');
const { reLogin, login } = global.get('identity.js');
const { convertSnakeCase, convertCamelCase } = global.get('utilities.js');
const { Order } = global.get('entities.js');

const API_KEY = env.get('GOOGLE_GEMINI_KEY');

if (!API_KEY) {
    node.error('API key is not set');
    node.status({ fill: 'red', shape: 'ring', text: 'API key is not set' });
    return msg;
}

class Gemini {
    #defaultModel = 'gemini-2.0-flash';
    #systemPrompt = 'You are an employee for a company that provides laboratory services. Very compliance, accurate and provessional. Response in Vietnamese language when it is appropriate.';
    #session;
    #chat;
    #chatHistory = [];

    constructor({ apiKey, session, model, systemPrompt }) {
        try {
            if (!session) throw new Error('Session is required');

            this.model = model || this.#defaultModel;
            this.apiKey = apiKey;
            this.ai = new GoogleGenAI({
                apiKey: this.apiKey || API_KEY,
            });

            this.#session = session;
            this.#systemPrompt = systemPrompt || this.#systemPrompt;
        } catch (error) {
            handleError(error, 'Gemini constructor');
            throw error;
        }
    }

    get db() { return LimsPools[this.session.appUID]; }
    get s3() { return s3Clients[this.session.appUID]; }
    get session() { return this.#session; }
    get appUID() { return this.session.appUID; }

    async genContent(contents, fileIds = []) {
        try {
            const fileContents = [];
            const contentListUnion = [];

            // Upload file to AI
            for (const fileId of fileIds) {
                const filePart = await this.loadFile(fileId);
                if (filePart) fileContents.push(filePart);
                else throw new cError(500, 'Uploaded file not found');
            }

            // Add contents to contentListUnion
            if (typeof contents === 'string') {
                contentListUnion.push(contents);
            }
            
            else if (Array.isArray(contents)) {
                contentListUnion.push(...contents);
            } else {
                contentListUnion.push(contents);
            }

            if (fileContents.length > 0) {
                contentListUnion.push(...fileContents);
            }

            // Generate content
            const response = await this.ai.models.generateContent({
                model: this.model,
                contents: contentListUnion,
                config: { systemInstruction: this.#systemPrompt },
            });

            return response;
        } catch (error) {
            handleError(error, 'genContent');
            return {
                success: false,
                error: error.message,
            };
        }
    }

    async chat(message, parsingFunction = Gemini.parseText) {
        try {
            if (!message) throw new cError(500, '[ Error ] Message is required');
            if (!parsingFunction) throw new cError(500, '[ Error ] Parsing function is required');

            // Lazy init chat
            if (!this.#chat) {
                this.#chat = await this.ai.chats.create({
                    model: this.model,
                    config: {
                        systemInstruction: this.#systemPrompt,
                        temperature: 0.3,
                        topP: 0.95,
                        topK: 40,
                        maxOutputTokens: 1024,
                    }
                });
                node.warn({ chat: this.#chat });
            }

            let response;
            if (typeof message === 'string') {
                // GỬI REQUEST ĐẾN CHAT
                response = await this.#chat.sendMessage({
                    message: message,
                });
                return parsingFunction(response);
            }

            return response;
        } catch (error) {
            handleError(error, `Gemini.chat ${this.model}`);
            throw error;
        }
    }
    
	async loadFile(fileId) {
		try {
			const uniFile = await UniFile.getFile(fileId, this.session);
			if (!uniFile) throw new cError(404, 'File not found');
			
			// Check if geminiFile exists and is not expired
			const now = new Date();
			if (uniFile.geminiFile && uniFile.geminiFile.expirationTime && new Date(uniFile.geminiFile.expirationTime) > now) {
				// Return cached geminiFile if still valid
                const dbGeminiFile = uniFile.geminiFile;
                const filePartFromDB = createPartFromUri(dbGeminiFile.uri, dbGeminiFile.mimeType);

				return filePartFromDB;
			}

			const filePath = await uniFile.download();
			if (!filePath) throw new Error('File not found');

			const file = await this.ai.files.upload({
				file: filePath,
				config: {
					mimeType: uniFile.mimeType,
					displayName: uniFile.fileName,
				}
			});

			// wait for file to be processed
			let getFile = await this.ai.files.get({ name: file.name });
			node.warn({ getFile });
			while (getFile.state === 'PROCESSING') {
				getFile = await this.ai.files.get({ name: file.name });
				node.warn(`current file status: ${getFile.state}`);
				node.warn('File is still processing, retrying in 5 seconds');
				await new Promise((resolve) => {
					setTimeout(resolve, 5000);
				});
			}

			if (getFile.state === 'FAILED') {
				throw new Error('File processing failed.');
			}

			// Update uniFile with new geminiFile info
			await uniFile.updateFile({
				geminiFile: getFile,
                processingStatus: 'SCHEDULED',
			});
			
			const filePart = createPartFromUri(getFile.uri, getFile.mimeType);
			
            return filePart;
		} catch (error) {
			handleError(error, 'loadFile');
			return {
				success: false,
				error: error.message,
			};
		}
	}

    /////// STATIC METHODS ///////
    static parseJson(response) {
        try {
            let cleanedText = response.candidates[0].content.parts[0].text.trim();

            // Remove markdown code blocks (```json ... ```)
            cleanedText = cleanedText.replace(/```json\s*/g, '').replace(/```\s*$/g, '');

            // Remove any leading/trailing whitespace and newlines
            cleanedText = cleanedText.trim();

            // If the text starts with a newline or whitespace, clean it
            cleanedText = cleanedText.replace(/^\s*\n\s*/, '');

            const jsonResult = JSON.parse(cleanedText);
            return {
                json: jsonResult,
                finishReason: response.candidates[0].finishReason,
                tokenCount: response.usageMetadata.totalTokenCount,
                modelName: response.modelVersion,
                success: true,
            };
        } catch (parseError) {
            // If JSON parsing fails, return the raw text with error info
            return {
                success: false,
                error: 'Failed to parse response as JSON',
                rawText: response?.text,
                cleanedText: response?.text || 'N/A',
                parseError: parseError?.message,
                metadata: {
                    finishReason: response?.finishReason,
                    tokenCount: response?.tokenCount,
                    modelName: response?.modelName
                }
            };
        }
    }

    static parseText(response) {
        try {
            // make sure resposne is an object
            if (typeof response !== 'object') throw new Error('Response is not an object');
            const text = response.candidates[0].content.parts[0].text;
            const finishReason = response.candidates[0].finishReason;
            const tokenCount = response.usageMetadata.totalTokenCount;
            const modelName = response.modelVersion;
            return {
                text,
                finishReason,
                tokenCount,
                modelName,
                success: true,
            };
        } catch (parseError) {
            return {
                success: false,
                error: 'Failed to parse response as text',
                rawText: response.text,
                parseError: parseError.message,
            };
        }
    }

    static async getGemini({ botConfig, model, systemPrompt }) {
        if (!botConfig) throw new cError(500, '[ WARNING ] BotConfig is required for a google instance');

        try {
            // LOGIN OR RE-LOGIN FOR SESSION 
            const session = await reLogin({
                email: botConfig.email,
                password: botConfig.password,
            }) || await login({
                email: botConfig.email,
                password: botConfig.password,
            });


            return new Gemini({
                apiKey: botConfig.geminiKey,
                session: session,
                model: model,
                systemPrompt: systemPrompt,
            });
        } catch (error) {
            handleError(error, 'getGemini');
            throw error;
        }
    }

	static async docClassification(fileId, session) {
		const gem = await Gemini.getGemini({
			model: 'gemini-2.0-flash',
			botConfig: env.get('BOT_CONFIG')['botfather@irdop.org'],
		});

		const result = await gem.genContent(`clasify this file accordingly to your system instruction, response json only: \n${Document_Classification_v1_250706.systemPrompt}`, [fileId])
		const systemTags = Gemini.parseJson(result);
		
		if(systemTags.success){
			const uniFile = await UniFile.getFile(fileId, session);

			// Get existing systemTags and userTags from uniFile
			const existingSystemTags = uniFile.systemTags || [];
			const existingUserTags = uniFile.userTags || [];

			// Get existing system tag codes for comparison
			const existingSystemTagCodes = existingSystemTags.map(tag => tag.code);
			const existingUserTagNames = existingUserTags.slice();

			// Add new systemTags if they don't exist
			const newSystemTags = systemTags.json.filter(tag => !existingSystemTagCodes.includes(tag.code));
			const updatedSystemTags = [...existingSystemTags, ...newSystemTags];

			// Add new userTags (systemTag names) if they don't exist
			const newUserTagNames = systemTags.json
				.map(tag => tag.name)
				.filter(name => !existingUserTagNames.includes(name));
			const updatedUserTags = [...existingUserTags, ...newUserTagNames];

			// Update the file with the merged tags
			await uniFile.updateFile({
				systemTags: updatedSystemTags,
				userTags: updatedUserTags
			});
		}

		if (systemTags.success) {
			// if document is code PHIEU_GUI_MAU, extract the data following the instruction
			for(const systemTag of systemTags.json){
				if (systemTag?.code === 'PHIEU_GUI_MAU') {
					let promt = `${Sample_Receipt_Json_Extraction_v1_250706.prompt} + ${JSON.stringify(Sample_Receipt_Json_Extraction_v1_250706.jsonSchema)}`
					// const extraction = await gem.chat(promt, Sample_Receipt_Json_Extraction_v1_250706.parseFunction);
					const extraction = await gem.genContent(promt, [fileId]);
					const receiptInfo = Gemini.parseJson(extraction)

					if (receiptInfo.success) {
						let order = receiptInfo.json;
						order.file_id = fileId;
						order = convertSnakeCase(order);
						
						const updatedOrder = await Order.insertOrUpdateOrder(order,session);
						const uniFile = await UniFile.getFile(fileId, session);
						
						// Update foreignKeyUIDs with order_code if it exists and not already present
						const existingForeignKeyUIDs = uniFile.foreignKeyUIDs || [];
						let updatedForeignKeyUIDs = existingForeignKeyUIDs;
						
						if (updatedOrder.order_code && !existingForeignKeyUIDs.includes(updatedOrder.order_code)) {
							updatedForeignKeyUIDs = [...existingForeignKeyUIDs, updatedOrder.order_code];
						}
						
						await uniFile.updateFile({
							processingStatus: 'PROCESSED',
							foreignKeyUIDs: updatedForeignKeyUIDs
						});

						return updatedOrder;
					}
				}
			}
		}
		return {};
	}

}



const DOC_TYPES_CODE = [
    { code: 'ANH_MAU', name: 'Ảnh mẫu', eng: 'Sample Image', description: 'Image of the sample/product/item that is being tested' },
    { code: 'PHIEU_GUI_MAU', name: 'Phiếu gửi mẫu', eng: 'Sample Request Form', description: 'Document form titled "PHIẾU GỬI MẪU THỬ NGHIỆM" that has information about client, sample, tests, that is being sent to the lab for testing' },
    { code: 'DON_HANG'                  , name: 'Đơn hàng'             , eng: 'Purchase Order',         description: `Document form titled "ĐƠN HÀNG"` },
    // { code: 'BAO_GIA'                   , name: 'Báo giá'              , eng: 'Quotation',              description: `Document form titled "BÁO GIÁ"` },
    // { code: 'BIEN_BAN_THU_NGHIEM'       , name: 'Bản kết quả thử nghiệm', eng: 'Test Result Report',        description: `Document form often has titled 'BIÊN BẢN THỬ NGHIỆM' that is produced from the individual tests batch procesdure. they don't have information about client` },
    // { code: 'PHIEU_KET_QUA_THU_NGHIEM'  , name: 'Phiếu kết quả thử nghiệm', eng: 'Certificate of Analysis', description: `Document form often titled 'PHIẾU KẾT QUẢ THỬ NGHIỆM'. Its has all detailed information about client, sample, tests, result and notation` },
    // { code: 'BIEN_BAN_KET_QUA_THU_NGHIEM', name: 'Bản kết quả thử nghiệm', eng: 'Test Result Report',       description: `Document form often titled 'Bản kết quả thử nghiệm'. The document would have result of all test done on the sample, no client information` },
    // { code: 'BIEN_BAN_BAN_GIAO_MAU'     , name: 'Bản giao mẫu', eng: 'Sample Delivery Report',              description: `Document form the title often has 'bản giao mẫu'. It's specifying who will receive the sample and which test will be performed` },
    // { code: 'TIEU_CHUAN_CO_SO_SAN_PHAM' , name: 'Tiêu chuẩn cơ sở sản phẩm', eng: 'Product Specification',  description: `Document form provided by the client, it has the standard for the sample that is being tested, can be used for reference` },
    // { code: 'TAI_LIEU_KHAC'             , name: 'Tài liệu khác'        , eng: 'Other Document',             description: `Other document that is not one of the above types` },
]

const Document_Classification_v1_250706 = {
    name: 'Document_Classification_v1_250706',
    model: 'gemini-2.0-flash',
    systemPrompt: `
        You are an employee for a company that provides laboratory services. Very compliance, accurate and provessional. Response in Vietnamese language unless instructed otherwise.
        Instructions: access the file up on asking, classify the given document into one of the following categories:
        ${DOC_TYPES_CODE.map(doc => `- Category Name: ${doc.name} (Eng: ${doc.eng}). Category code: (${doc.code}), description: ${doc.description}`).join('\n')}
        Response me in JSON format with the following structure:
        [{
            "code": "CODE",
            "name": "NAME",
            "eng": "ENG"
        }]
    `,
    parseFunction: Gemini.parseJson,
}

const Sample_Receipt_Json_Extraction_v1_250706 = {
    name: 'Sample_Receipt_Json_Extraction_v1_250706',
    model: 'gemini-2.0-flash',
    prompt: `
        Extract the information from the file accordingly in the following requirements:
        Response me in JSON format with the following schema:
    `,
    jsonSchema:
    {
        "type": "object",
        "properties": {
            "orderCode": {
                "type": "string",
                "pattern": "^DH[0-9]{7}$",
                "description": "Order code with format DH followed by 7 digits"
            },
            "totalAmount": {
                "type": "integer",
                "description": "Total amount before tax"
            },
            "client": {
                "type": "object",
                "description": "Information under section 1.1 in the document",
                "properties": {
                    "legalId": { "type": "string", "description": "Legal identification number of the client" },
                    "clientName": { "type": "string", "description": "Name of the client" },
                    "clientPhone": { "type": "string", "description": "Phone number of the client" },
                    "invoiceInfo": { "type": "string", "description": "Invoice information" },
                    "invoiceEmail": { "type": "string", "description": "Email for invoicing" },
                    "clientAddress": { "type": "string", "description": "Address of the client" }
                },
                "required": ["legalId", "clientName", "invoiceEmail", "clientAddress"]
            },
            "contact": {
                "type": "object",
                "description": "Information under section 1.2 in the document",
                "properties": {
                    "id": { "type": "string", "description": "Identification number of the contact person" },
                    "name": { "type": "string", "description": "Name of the contact person" },
                    "email": { "type": "string", "description": "Email of the contact person" },
                    "phone": { "type": "string", "description": "Phone number of the contact person" },
                    "idDate": { "type": "string", "description": "Date of issue of the identification" },
                    "idPlace": { "type": "string", "description": "Place of issue of the identification" }
                },
                "required": ["name", "email", "phone"]
            },
            "receiver": {
                "type": "object",
                "description": "Information under section 2 in the document",
                "properties": {
                    "name": { 
                        "type": "string", 
                        "description": "Name of the receiver (distinct from contact person in section 1.2)"
                    },
                    "email": { "type": "string", "description": "Email of the receiver" },
                    "address": { "type": "string", "description": "Address of the receiver" }
                },
                "required": ["address"]
            },
            "samples": {
                "type": "array",
                "description": "List of samples",
                "items": {
                    "type": "object",
                    "properties": {
                        "sampleName": {
                            "type": "string",
                            "description": "Name of the sample"
                        },
                        "matrix": {
                            "type": "string",
                            "description": "Sample matrix"
                        },
                        "sampleInformation": {
                            "type": "array",
                            "description": "Sample information with field names taken directly from input data, prioritized to match: 'Tên mẫu thử / name.', 'Số lô / LOT no.', 'Ngày sản xuất / mfg.', 'Hạn sử dụng / exp.', 'Nơi sản xuất / mfr.', 'Số công bố / pub. no.', 'Số đăng ký / reg. no.'; retains original field names (e.g., 'Địa chỉ') if no match is found; excludes 'Ngày tiếp nhận', 'Ngày thử nghiệm', 'Mô tả'; must include an entry with fname 'Tên mẫu thử / name.' whose fvalue matches sampleName",                            "items": {
                                "type": "object",
                                "properties": {
                                    "fname": { 
                                        "type": "string",
                                        "description": "Field name taken directly from input data (e.g., 'Địa chỉ' for address), prioritized to match: 'Tên mẫu thử / name.', 'Số lô / LOT no.', 'Ngày sản xuất / mfg.', 'Hạn sử dụng / exp.', 'Nơi sản xuất / mfr.', 'Số công bố / pub. no.', 'Số đăng ký / reg. no.'; retains original value if no match; excludes 'Ngày tiếp nhận', 'Ngày thử nghiệm', 'Mô tả'"
                                    },
                                    "fvalue": { 
                                        "type": "string",
                                        "description": "Value corresponding to the field name (e.g., 'ul. Gołębiewskiego 6, 07-100 Węgrów, Poland' for 'Địa chỉ')"
                                    }
                                },
                                "required": ["fname"]
                            }
                        },
                        "analysis": {
                            "type": "array",
                            "description": "List of tests for the sample",
                            "items": {
                                "type": "object",
                                "properties": {
                                    "parameterName": { "type": "string", "description": "Name of the test parameter" },
                                    "protocol": { "type": "string", "description": "Test protocol" },
                                    "resultUnit": { "type": "string", "description": "Unit of the test result" }
                                }
                            }
                        }
                    }
                }
            }
        },
        "required": ["orderCode", "totalAmount", "client", "contact", "receiver", "samples"]
    },
    parseFunction: Gemini.parseJson,
}

const TEST_DOC_PROCESSING_STATUS = [
    { name: 'Chờ xử lý', eng: 'Idle', code: 'IDLE' },
    { name: 'Đã đặt lịch', eng: 'Scheduled', code: 'SCHEDULED' },
    { name: 'Lỗi', eng: 'Error', code: 'ERROR' },
    { name: 'Chờ duyệt', eng: 'Pending Approval', code: 'PENDING_APPROVAL' },
    { name: 'Từ chối', eng: 'Rejected', code: 'REJECTED' },
    { name: 'Đã duyệt', eng: 'Approved', code: 'APPROVED' },
]

const OBJECT_STATUS = {
    'UPLOADING': { name: 'Đang tải lên', eng: 'Uploading' },
    'OK': { name: 'OK', eng: 'OK' },
    'NOT_FOUND': { name: 'Không tìm thấy', eng: 'Not Found' },
    'DELETED': { name: 'Đã xóa', eng: 'Deleted' }
}

const standardJSON_COA = {
    standardName: 'COA',    // interface name (ts)
    standardVersion: '1.0.0',
    jsonCreator: 'modelName',
    jsonCreatedAt: 'timestamp',

    docType: '',            // Data, SoftCopy, HardCopy, Official, Draft
    fileMime: '',           // For soft copy only
    docSignedBy: '',        // Tên người ký
    docCoSignedBy: '',      // Tên người ký phụ
    docSignedDate: '',      // Ngày ký
    docCoSignedDate: '',    // Ngày ký phụ

    docRefNumber: '',       // Số tài liệu
    docRefDate: '',         // Ngày tài liệu

    data: {
        client: {},     // Provided
        PO: {},         // Function call
        contact: {},    // Provided
        receiver: {},   // Provided
        deadline: '',   // Provided
        samples: [
            {
                matrix: '',             // Function call
                sampleName: '',        // Provided
                sampleDescription: '',  // Provided 
                sampleInformation: [
                    {
                        fname: 'Tên mẫu',   // Required
                        fvalue: '',         // Required
                    },
                    // ... other fields as provided
                ],
                analysis: [
                    {
                        parameterName: '', // Provided
                        resultUnit: '',     // Provided
                        protocolCode: '',   // TCVN, HDPP, ISO, etc. optional   (Provided)
                        accreditationNotation: '', // Provided
                        price: '',           // Function call
                    },
                    // ...
                ],
            },
            // ...
        ],
    }
}

const standardJSON_Receipt = {
    client: {},     // QUERY DATA BASE ON CLIENT LEGAL ID
    PO: {},         // QUERY MISA
    contact: {},
    receiver: {},
    deadline: '',     // optional from function call
    samples: [
        {
            matrix: '',         // optional from function call
            sampleName: '',    // from provided data
            sampleDescription: '', // from provided data 
            sampleInformation: [
                {
                    fname: 'Tên mẫu',  // required
                    fvalue: '',         // required
                },
                {
                    fname: 'Mã mẫu',   // optional as client provided 
                    fvalue: '',        // optional as client provided
                },
                // ... other fields as client provided
            ],
            analysis: [
                {
                    parameterName: '',
                    resultUnit: '',     // optional from client request
                    protocolCode: '',   // TCVN, HDPP, ISO, etc. optional   (client request/function call)
                    protocolSource: '', // (EX, IRDOP) optional             (client request/function call)
                    price: '',           // from provided data
                },
                // ...
            ],
            // ...
        },
        // ...
    ],

}

const standardJSON_BIEN_BAN_THU_NGHIEM = {
    fileId: '',
    docRefNumber: '',   // from document
    signers: [{
        publicKey: '',
        signerName: '',
        timestamp: '',
        tokenProvider: '',
        purpose: ''
    }],
    extractedAnalysisData: [
        {
            sampleId: '',       // required
            sampleName: '',     // optional for validation
            parameterId: '',    // required
            parameterName: '',  // optional for validation
            resultValue: '',    // required, in html format <p>...</p> including <sub>, <sup>, multipline symbols where needed
            resultUnit: '',     // optional, in html format <p>...</p> including <sub>, <sup>, multipline symbols where needed
            comment: '',        // optional
        },
        // ...
    ]
}

const entities = global.get('entities.js');
entities.Gemini = Gemini;
node.status({ fill: 'green', shape: 'ring', text: 'OK' });
node.warn('Gemini.js loaded');
return msg;