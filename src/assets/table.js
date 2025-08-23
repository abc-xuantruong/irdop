const { createCache } = global.get('cache.js');
const { Gem, LAB, UniFile, Session, Entity } = global.get('entities.js');
const { cError, handleBotError } = global.get('utilities.js');
// --
const { v4: uuidv4 } = global.get('uuid');
const path = global.get('path');
const fs = global.get('fs');
const fsPromises = global.get('fs').promises;
const mime = global.get('mimetype');


class DocAgent extends Gem {
    static #basedFuncNames = ['splitDoc', 'docTypeClassifierAgent', 'sampleAdmisionAgent'];
    #session;

    constructor(params) {
        params.basedFuncNames = [...new Set([...(params.basedFuncNames || []), ...DocAgent.#basedFuncNames])];
        super(params);
        this.#session = params.session;
    }

    get session() { return this.#session; }

    async classify({ file, isNewBranch = false }) {
        try {
            if (!file) throw new cError(400, 'Function input must contain a file object with fileId and/or filePath');

            const branchId = isNewBranch ? `DocClassify_${uuidv4().slice(0, 4)}` : 'main';

            return await this.genContent({
                prompt: `
                    You are given a file. In this file may contain multiple documents.
                    Your task is to classify the file into one of the following categories:
                    If the file contains multiple documents, you should classify each document into one of the following classifier codes:
                    ${CLASSIFIER_CODES.map(classifier => `- ${classifier.classifierCode}: (${classifier.description})`).join('\n')}
                    File additional information: ${JSON.stringify({
                    fileId: file.fileId,
                    mimeType: file.mimeType,
                    filePath: file.filePath
                })}
                `,
                files: [file],
                jsonSchema: {
                    type: 'object',
                    properties: {
                        error: { type: 'string', description: 'The reason if operation failed, empty string if successful' },
                        success: { type: 'boolean', description: 'True if the operation is successful' },
                        data: {
                            type: 'array', description: 'The data object if the operation is successful',
                            items: {
                                type: 'object',
                                properties: {
                                    classifierCode: { type: 'string', description: 'The exact classifier code', enum: CLASSIFIER_CODES.map(classifier => classifier.classifierCode) },
                                    startPage: { type: 'number', description: 'The start page of the classifier (1-based)' },
                                    endPage: { type: 'number', description: 'The end page of the document classifier (1-based)' },
                                    totalPages: { type: 'number', description: 'The total pages of the whole file (not just the part of the classifier)' },
                                    docId: { type: 'string', description: 'The document digital fingerprint or docId in the bottom of pages, starts with "DFPx". Empty string if not available', pattern: '^DFPx.*' },
                                    copyType: { type: 'string', description: 'The copy type of the document', enum: ['FULL_COPY', 'PARTIAL_COPY'] },
                                }
                            }
                        }
                    }
                },
                branchId,
                interactiveMode: false,
                functionCallMode: 'none'
            })
        } catch (error) {
            handleBotError(error, 'docClassifing');
            return { error: error.message };
        }
    }

    async extractMetadata({ classifier, fileRecord, isNewBranch = false }) {
        if (!classifier) throw new cError(400, 'Function input must contain a classifier object');
        if (!classifier.classifierCode) throw new cError(400, 'Function input must contain a classifier object with classifierCode');
        if (classifier.copyType !== 'FULL_COPY') throw new cError(400, 'Function input must contain a classifier object with copyType FULL_COPY');

        try {
            let params = {};
            params.branchId = isNewBranch ? `RetrieveMetadata_${classifier.classifierCode}_${uuidv4().slice(0, 4)}` : 'main';
            params.files = [fileRecord];

            // check if there is a instruction for the given classifier code if not return error
            const classifierCodeInfo = CLASSIFIER_CODES.find(classifierItem => classifierItem.classifierCode === classifier.classifierCode);
            if (!classifierCodeInfo) throw new cError(400, `No classifier code info found for classifier code ${classifier.classifierCode}`);
            if (!classifierCodeInfo.metadataJsonSchema) throw new cError(400, `No json schema found for classifier code ${classifier.classifierCode}`);

            params.prompt = `Extract the document within the classifier information from the file:\n${JSON.stringify(classifier)}.`;
            params.jsonSchema = {
                type: 'object',
                properties: {
                    error: { type: 'string', description: 'The error message if failed to extract the document within the classifier' },
                    success: { type: 'boolean', description: 'True if the operation is successful' },
                    instructionId: {
                        type: 'string',
                        description: 'Fixed instruction version',
                        enum: ['I_EXTRACT_PHIEU_KET_QUA_THU_NGHIEM_V1_1'],
                        default: 'I_EXTRACT_PHIEU_KET_QUA_THU_NGHIEM_V1_1'
                    },
                    data: classifierCodeInfo.metadataJsonSchema,
                }
            };
            params.interactiveMode = false;
            params.functionCallMode = 'none';

            const res = await this.genContent(params);
            return res;
        } catch (error) {
            handleBotError(error, 'retrieveMetadata');
            return { error: error.message };
        }
    }

    async extractLabTestResult({ promptContent, file, isNewBranch = false }) {
        if (!promptContent && !file) throw new cError(400, 'Function input must contain a promptContent or file');
        if (promptContent && file) throw new cError(400, 'Function input must contain a promptContent or file, not both');

        try {
            const branchId = isNewBranch ? `ExtractLabTestResult_${uuidv4().slice(0, 4)}` : 'main';

            return await this.genContent({
                prompt: `You are given one Internal Laboratory test report of a ISO/IEC 17025 accredited laboratory. Extract the exact information provided in the document. \n\n${promptContent || null}`,
                files: [file],
                jsonSchema: {
                    type: 'object',
                    properties: {
                        error: { type: 'string', description: 'The reason if the operation failed, empty string if successful' },
                        success: { type: 'boolean', description: 'True if the operation is successful' },
                        data: {
                            type: 'array',
                            description: 'The array of each test results in this document. If the document suggesting conflicting information or no test results, operation failed',
                            items: {
                                type: 'object',
                                properties: {
                                    sampleId: { type: 'string', description: 'The sample ID of the test' },
                                    sampleName: { type: 'string', description: 'The sample name of the test, if not available, leave it empty' },
                                    sampleDescription: { type: 'string', description: 'The sample description of the test, if not available, leave it empty' },
                                    testId: { type: 'integer', description: 'The test ID of the test, if not available, leave it empty' },
                                    testProtocolCode: { type: 'string', description: 'The test protocol code of the test, if not available, leave it empty' },
                                    testName: { type: 'string', description: 'The test name of the test, if not available, leave it empty' },
                                    testUnit: { type: 'string', description: 'The test unit of the test. Use HTML strings format. Use <sub> and <sup> tags for subscripts and superscripts. If not available, leave it empty' },
                                    testResult: { type: 'string', description: 'The final result of the test. Use HTML strings format. Use <sub> and <sup> tags for subscripts and superscripts. If not available, leave it empty' },
                                    testReference: { type: 'string', description: 'The reference value of the test, if not available, leave it empty' },
                                    testCommentary: { type: 'string', description: 'The commentary of the test, if not available, leave it empty' },
                                }
                            }
                        }
                    }
                },
                branchId,
                interactiveMode: false,
                functionCallMode: 'none'
            })
        } catch (error) {
            handleBotError(error, 'extractLabTestResult');
            return { error: error.message };
        }
    }

    async qualifyLabTestResult({ promptContent = null, file = null, isNewBranch = false } = {}) {
        try {
            const branchId = isNewBranch ? `QualifyLabTestResult_${uuidv4().slice(0, 4)}` : 'main';

            return await this.genContent({
                prompt: `Based on the lab test result, determine any issues may arise in terms of:
                1. Conflict information within the lab test result document it self
                2. Technical mistake could have been made by the technician given the information provided in the lab test result document itself
                3. Test result may cause concern given the nature of samples
                4. (Only if the reference value is provided in the context) a result may cause concern given the reference value provided in the lab test result document

                Return the result in the following JSON structure:

                ${promptContent || null}`,
                files: file ? [file] : [],
                jsonSchema: {
                    type: 'object',
                    properties: {
                        error: { type: 'string', description: 'The reason if the operation failed, empty string if successful' },
                        success: { type: 'boolean', description: 'True if the operation is successful' },
                        data: {
                            type: 'array',
                            description: 'The array of concerns for each test results in this document. If the document suggesting conflicting information or no test results, operation failed',
                            items: {
                                type: 'object',
                                properties: {
                                    sampleId: { type: 'string', description: 'The sample ID of the test result. If there is no sample ID, leave it empty' },
                                    testId: { type: 'integer', description: 'The test ID of the test result. If there is no test ID, leave it empty' },
                                    conflict: { type: 'string', description: 'The conflict information within the lab test result document it self. If there is no conflict, leave it empty' },
                                    conflictSeverity: { type: 'string', description: 'The severity score from 0 to 5 of the conflict information within the lab test result document it self. If there is no conflict, leave it empty' },

                                    technicalConcern: { type: 'string', description: 'The technical mistake could have been made by the technician given the information provided in the lab test result document itself. If there is no mistake, leave it empty' },
                                    technicalConcernSeverity: { type: 'string', description: 'The severity score from 0 to 5 of the technical mistake could have been made by the technician given the information provided in the lab test result document itself. If there is no mistake, leave it empty' },

                                    resultConcern: { type: 'string', description: 'The test result may cause concern given the nature of samples. If there is no concern, leave it empty' },
                                    resultConcernSeverity: { type: 'string', description: 'The severity score from 0 to 5 of the test result may cause concern given the nature of samples. If there is no concern, leave it empty.' },

                                    resultReferenceConcern: { type: 'string', description: 'If a reference value is provided externally, the test result may cause concern given the reference value. If there is no concern, leave it empty' },
                                    resultReferenceConcernSeverity: { type: 'string', description: 'The severity score from 0 to 5 of the test result may cause concern given the reference value provided in the lab test result document itself. If there is no concern, leave it empty.' },
                                }
                            }
                        }
                    }
                },
                branchId,
                interactiveMode: false,
                functionCallMode: 'none'
            })
        } catch (error) {
            handleBotError(error, 'qualifyLabTestResult');
            return { error: error.message };
        }
    }

    async sendResultToClient(files) { // interactiveMode: false
        if (!Array.isArray(files)) files = [files];
        try {
            // Prepare the files input, make sure all files exists
            for (let i = 0; i < files.length; i++) {
                let file = files[i];
                if (typeof file === 'string' && UniFile.checkFileId(file)) {
                    const uniFile = await UniFile.getFile(file, this.session);
                    if (!uniFile) throw new cError(404, `File ${file} not found`);
                    await uniFile.download();
                    files[i] = uniFile;
                }
                else if (typeof file === 'string') {
                    // It is a file path verify the file exists
                    if (!fs.existsSync(file)) throw new cError(404, `File ${file} not found`);
                    files[i] = {
                        filePath: file,
                        mimeType: mime.lookup(file)
                    }
                }
            }

            for (let i = 0; i < files.length; i++) {
                let file = files[i];
                if (file instanceof UniFile) {

                }
            }
        } catch (error) {
            handleBotError(error, 'sendResultToClient');
            return { error: error.message };
        }
        // given files [{fileId, filePath}, and/or {id, startPage, endPage, fileId, docMetadata, className: DocClassifier}]
        // Validate the fileRecordOrClassifiers


        // if filePath or fileId is provided
        // Step 1: classify the type of the document (docTypeClassifierAgent)
        // Step 2: Save the document classification and corresponding file (if only filePath is provided) to database using UniFile
        // Step 3: Select only the documents that are PHIEU_GUI_MAU
        // Step 4: Split the documents into smaller parts (sample by sample) (splitDoc)
        // Step 5: Send the result to client via Email (sendEmailAgent)

        // if classifier type {startPage, endPage, fileId, docMetadata} is provided
        // Step 1: Verify the classifierID is valid, if not create a new classifier record
        // Step 2: Get the file using UniFile and verify the right classifier type
        // Step 3: Extract the doc classifier from the file
        // Step 4: Split the documents into parts (sample by sample) (splitDoc)
        // Step 5: Send the documents to client via Email (sendEmailAgent) via the classifierID

        // TODO: Implement the actual processing logic
        return { success: true, files: files };
    }
}

class LabAgent extends Gem {
    #session;

    constructor(params) {
        super(params);
        this.#session = params.session;
    }

    get session() { return this.#session; }

    /**
     * extractTestResult
     * Purpose: Extract laboratory test result rows from either (1) promptContent (HTML/text string) OR (2) an attached file (pdf/image already OCRed).
     * Constraints:
     *  - Provide ONLY one of promptContent or file.
     *  - If none provided -> 400 error.
     * Output: Array of test result records preserving original spelling / symbols (use <sub>/<sup> where they appear). No inference.
     */
    async extractTestResult({ promptContent = null, file = null, isNewBranch = false } = {}) {
        if (!promptContent && !file) throw new cError(400, 'Either promptContent or file is required');
        if (promptContent && file) throw new cError(400, 'Provide only one of promptContent or file');

        const branchId = isNewBranch ? `ExtractTestResult_${uuidv4().slice(0, 4)}` : 'main';

        return await this.genContent({
            prompt: [
                'ROLE: ISO/IEC 17025 lab data extraction assistant.',
                'TASK: Extract EVERY test result line (no hallucination). Sources: HTML tables / plain text / OCR.',
                'COLUMNS:',
                '- Sample ID: pattern SP25xxxx-01 etc, empty if missing.',
                '- Test Name: keep original text.',
                '- Protocol Codes: all method identifiers in original order. Patterns examples: HDPP19-TN(A); TCVN 7087:2020; QCVN 01-190:2023/BYT; ISO 18416:2015; ASTM E111; AOAC 999.11; USP <61>; EN 12345; CODEX ...; JECFA ...; TB23; SOP 12; BS EN ...; DIN .... If >1 join with "; ". Strip trailing explanatory phrases (e.g. expiry dates).',
                '- Result Value: principal numeric/symbolic part only (keep <, >, ≤, ≥, ND, KPH, ND(<0.1), ±, scientific notation). No unit.',
                '- Unit: only unit (allow <sup>/<sub>).',
                '- Comment: internal remark if present, else empty.',
                'RULES:',
                '1 No translation. 2 No guessing -> empty string. 3 One row per (sampleId + testName).',
                '4 Preserve order. 5 Preserve symbols (<, >, ±, ×10^…), use <sup>/<sub>.',
                'Return JSON per schema below.',
                (promptContent || '').trim()
            ].join('\n'),            
            files: file ? [file] : [],
            jsonSchema: {
                type: 'object',
                properties: {
                    error: { type: 'string', description: 'Error message if failed, empty when success' },
                    success: { type: 'boolean', description: 'True if at least one result line extracted' },
                    data: {
                        type: 'array',
                        description: 'Ordered list of extracted test result rows',
                        items: {
                            type: 'object',
                            properties: {
                                sampleId: { type: 'string', description: 'Sample code; empty if not found' },
                                sampleName: { type: 'string', description: 'Sample name; empty if not found' },
                                testName: { type: 'string', description: 'Original test / parameter name' },
                                testProtocolCode: { type: 'string', description: 'Method / protocol code; empty if not found' },
                                testResult: { type: 'string', description: 'Result value only (no unit), keep symbols (<, >, ±, etc.)' },
                                testUnit: { type: 'string', description: 'Unit only, may use <sub>/<sup>; empty if none' },
                                testId: { type: 'integer', description: 'ID of the test' }, // test id if available, empty if not found
                                testCommentary: { type: 'string', description: 'Remark / note if present; empty if none' },
                                testReference: { type: 'string', description: 'The test reference' },
                            },
                            required: ['testName']
                        }
                    }
                }
            },
            branchId,
            interactiveMode: false,
            functionCallMode: 'none'
        });
    }

    /**
     * matchTestNameToID
     * Purpose: Map each extracted test result (input) to a canonical test list provided via promptContent.
     * promptContent should include a list JSON or table of canonical tests: [{ id, sampleUID?, parameterName }].
     * Matching Strategy (instructions to model):
     *  - First attempt strict (case-insensitive) equality of names.
     *  - Fallback: normalize (trim, collapse spaces, remove common stop words: test, analysis, determination, of, chi tieu, ham luong, content, the, a, an; remove punctuation like (), -, / when not meaningful) and compare.
     *  - Accept approximate match when character difference <=30% and highest similarity among candidates.
     *  - Prefer matches where sampleId equals sampleUID if provided.
     *  - One canonical id per extracted row. If ambiguous -> leave testId empty and append short ambiguity note into testCommentary (retain existing commentary if any, append with '; ').
     * Output: Same array structure with testId filled where confidently matched.
     */
    async matchTestNameToID({ promptContent, file = null, isNewBranch = false }) {
        if (!promptContent && !file) throw new cError(400, 'promptContent (canonical test list) or file is required');

        const branchId = isNewBranch ? `MatchTestNameToID_${uuidv4().slice(0, 4)}` : 'main';

        return await this.genContent({
            prompt: `You are given:\n1) CANONICAL TEST LIST (with id) below.\n2) Either an attached file containing previously extracted results OR caller embeds JSON results in the prompt.\nTask: For each extracted result row, identify the canonical test and fill testId.\nRules:\n- Do NOT alter original testName.\n- Leave testId empty if no clear match.\n- Never invent new ids.\n- If multiple similar candidates tie, leave testId empty and add ambiguity note to testCommentary (append).\n- Output must strictly follow schema.\n\nCANONICAL LIST:\n${promptContent || ''}`,
            files: file ? [file] : [],
            jsonSchema: {
                type: 'object',
                properties: {
                    error: { type: 'string', description: 'Error message if failed' },
                    success: { type: 'boolean', description: 'True if processed successfully' },
                    data: {
                        type: 'array',
                        description: 'Test results with matched testId where possible',
                        items: {
                            type: 'object',
                            properties: {
                                sampleId: { type: 'string', description: 'Sample code if available' },
                                testName: { type: 'string', description: 'Original test name' },
                                testId: { type: 'string', description: 'Matched canonical test id; empty if none' },
                                testProtocolCode: { type: 'string', description: 'From extraction step' },
                                testResult: { type: 'string', description: 'From extraction step' },
                                testUnit: { type: 'string', description: 'From extraction step' },
                                testCommentary: { type: 'string', description: 'Original commentary; may include ambiguity note' }
                            },
                            required: ['testName']
                        }
                    }
                }
            },
            branchId,
            interactiveMode: false,
            functionCallMode: 'none'
        });
    }

}

const CLASSIFIER_CODES = [
    {
        classifierCode: 'PHIEU_GUI_MAU',
        name: 'Phiếu gửi mẫu',
        description: 'Has "Phiếu gửi mẫu" on the first page title. Must has information about the who requested (client), what samples and which analytes',
        similarityCheck: ['refNumber', 'sampleId', 'clientName', 'clientAddress', 'sampleName', 'analyses'],
        metadataToFind: ['refNumber'],
        metadataJsonSchema: {
            type: 'object', description: 'The data object if the operation is successful', properties: {
                refNumber: {
                    type: 'string',
                    description: 'The valid reference number of the document located bellow the title. A valid ref number starts with "PPT" and contain alphanumeric characters and one dash "-". Null if the document is a draft',
                },
                date: { type: 'string', description: 'The date of the document. Often comes right after the refNumber.' },
                client: {
                    type: 'object',
                    description: 'The client information, often grouped in a block. Include any additional client-related information found in the document',
                    properties: {
                        clientId: { type: 'string', description: 'The client ID on the top right corner of the client information block' },
                        name: { type: 'string', description: 'The name of the client' },
                        address: { type: 'string', description: 'The address of the client' },
                        phone: { type: 'string', description: 'The phone of the client if available' },
                        email: { type: 'string', description: 'The email of the client if available' },
                    },
                    additionalProperties: true,
                    required: ['name']
                },
                sample: {
                    type: 'array',
                    description: "Sample information with field names taken directly from input data, prioritized to match: 'Tên mẫu thử / name.', 'Số lô / LOT no.', 'Ngày sản xuất / mfg.', 'Hạn sử dụng / exp.', 'Nơi sản xuất / mfr.', 'Số công bố / pub. no.', 'Số đăng ký / reg. no.'; retains original field names (e.g., 'Nơi lấy mẫu') if no match is found; explicitly excludes 'Ngày tiếp nhận', 'Ngày thử nghiệm', 'Mô tả' and any variants (e.g., 'Ngày tiếp nhận / receipt date.'); must include an entry with fname 'Tên mẫu thử / name.' whose fvalue matches sampleName",
                    items: {
                        type: 'object',
                        properties: {
                            fName: {
                                type: "string",
                                description: "Field name taken directly from input data (e.g., 'Địa chỉ' for address), prioritized to match: 'Tên mẫu thử / name.', 'Số lô / LOT no.', 'Ngày sản xuất / mfg.', 'Hạn sử dụng / exp.', 'Nơi sản xuất / mfr.', 'Số công bố / pub. no.', 'Số đăng ký / reg. no.'; retains original value (e.g., 'Địa chỉ') if no match; explicitly excludes 'Ngày tiếp nhận', 'Ngày thử nghiệm', 'Mô tả' and any variants (e.g., 'Ngày tiếp nhận / receipt date.'); an entry with 'Tên mẫu thử / name.' is mandatory and its fvalue must match sampleName"
                            },
                            fValue: {
                                type: "string",
                                description: "Value corresponding to the field name (e.g., 'ul. Gołębiewskiego 6, 07-100 Węgrów, Poland' for 'Địa chỉ'; must match sampleName for 'Tên mẫu thử / name.')",
                            }
                        },
                        required: ["fName"],
                        minItems: 1,
                    }
                },
                analyses: {
                    type: 'array',
                    description: "List of tests done on the sample. Each test is a row",
                    items: {
                        type: 'object',
                        properties: {
                            parameterName: {
                                type: "string",
                                description: "Name of the test parameter"
                            },
                            protocolCode: {
                                "type": "string",
                                "description": "Test protocol corresponding to the parameterName"
                            },
                            resultUnit: {
                                "type": "string",
                                "description": "Unit of the test result corresponding to the parameterName"
                            },
                            resultValue: {
                                "type": "string",
                                "description": "Test result value corresponding to the parameterName"
                            },
                            reference: {
                                "type": "string",
                                "description": "Reference value with unit from the 'Tiêu chuẩn cơ sở sản phẩm' (Product Specification) document, if available and processed later (e.g., '5.0-7.0 pH' for pH test, 'Not detected' for Hg test); not included if no specification is provided"
                            },
                        },
                        required: ["parameterName", "protocolCode", "resultValue", "resultUnit"]
                    }
                },
                legal: {
                    type: 'object',
                    properties: {
                        legalStatus: {
                            type: 'string',
                            description: 'Legal status of the document. legal bound only if not draft, valid ref number and date, signed and stamped by an Authorized person. Select the closest status from the list',
                            enum: ['UNKNOWN', 'LEGAL_HOLD', 'NOT_LEGAL', 'DRAFT', 'WITHDRAWN', 'EXPIRED', 'UNSIGNED'],
                            default: 'UNKNOWN'
                        },
                        legalSigners: {
                            type: 'array',
                            description: "List of signers",
                            items: {
                                type: 'object',
                                properties: {
                                    name: { type: 'string', description: 'The name of the person who signed. Null if unsigned' },
                                    position: { type: 'string', description: 'The position of the signer. Null if unsigned' },
                                    isStamped: { type: 'boolean', description: 'True if the stamp is present on this signature. Null if unsigned' }
                                }
                            }
                        },
                    }
                }
            }
        }
    }, {
        classifierCode: 'DON_HANG',
        name: 'Đơn hàng',
        name_en: 'Purchase Order',
        description: 'Has "Đơn hàng" on the first page title. Must has information about the client, prices for the samples and analytes requested, has code started with "DH"',
    },
    {
        classifierCode: 'BIEN_BAN_THU_NGHIEM',
        name: 'Biên bản thử nghiệm',
        name_en: 'Lab Test Report',
        description: 'Has "Biên bản thử nghiệm" on the title. Must has information about the tests and results and samples which tested.',
        metadataToFind: ['docId'],
    },
    {
        classifierCode: 'PHIEU_KET_QUA_THU_NGHIEM',
        name: 'Phiếu kết quả thử nghiệm',
        name_en: 'Certificate of Analysis',
        description: 'Has title "Phiếu kết quả thử nghiệm" or "Certificate of Analysis". Must has information about the client, samples and analytes results. Has published code started with "PPT" and date if official. Legal bound only if signed and stamped by Authorized person',
        similarityCheck: ['refNumber', 'sampleId', 'clientName', 'clientAddress', 'sampleName', 'analyses'],
        metadataToFind: ['refNumber'],
        metadataJsonSchema: {
            type: 'object',
            description: 'The data object if the operation is successful',
            properties: {
                refNumber: {
                    type: 'string',
                    description: 'The valid reference number of the document located below the title. A valid ref number starts with "PPT" and contains alphanumeric characters and one dash "-". Null if the document is a draft',
                },
                date: {
                    type: 'string',
                    description: 'The date of the test results document. Often comes right after the refNumber.'
                },
                client: {
                    type: 'object',
                    description: 'The client information, often grouped in a block. Include any additional client-related information found in the document',
                    properties: {
                        clientId: { type: 'string', description: 'The client ID on the top right corner of the client information block' },
                        name: { type: 'string', description: 'The name of the client' },
                        address: { type: 'string', description: 'The address of the client' },
                        phone: { type: 'string', description: 'The phone of the client if available' },
                        email: { type: 'string', description: 'The email of the client if available' },
                    },
                    additionalProperties: true,
                    required: ['name']
                },
                sample: {
                    type: 'array',
                    description: "Sample information with field names taken directly from input data, prioritized to match: 'Tên mẫu thử / name.', 'Số lô / LOT no.', 'Ngày sản xuất / mfg.', 'Hạn sử dụng / exp.', 'Nơi sản xuất / mfr.', 'Số công bố / pub. no.', 'Số đăng ký / reg. no.'; retains original field names (e.g., 'Nơi lấy mẫu') if no match is found; must include an entry with fname 'Tên mẫu thử / name.' whose fvalue matches sampleName",
                    items: {
                        type: 'object',
                        properties: {
                            fName: {
                                type: "string",
                                description: "Field name taken directly from input data (e.g., 'Địa chỉ' for address), prioritized to match: 'Tên mẫu thử / name.', 'Số lô / LOT no.', 'Ngày sản xuất / mfg.', 'Hạn sử dụng / exp.', 'Nơi sản xuất / mfr.', 'Số công bố / pub. no.', 'Số đăng ký / reg. no.'; retains original value (e.g., 'Địa chỉ') if no match; an entry with 'Tên mẫu thử / name.' is mandatory and its fvalue must match sampleName"
                            },
                            fValue: {
                                type: "string",
                                description: "Value corresponding to the field name (e.g., 'ul. Gołębiewskiego 6, 07-100 Węgrów, Poland' for 'Địa chỉ'; must match sampleName for 'Tên mẫu thử / name.')",
                            }
                        },
                        required: ["fName"],
                        minItems: 1,
                    }
                },
                testResults: {
                    type: 'array',
                    description: "List of test results for the sample. Each test result is a row with parameter name, result value, unit, and reference values",
                    items: {
                        type: 'object',
                        properties: {
                            parameterName: {
                                type: "string",
                                description: "Name of the test parameter"
                            },
                            protocolCode: {
                                "type": "string",
                                "description": "Test protocol corresponding to the parameterName"
                            },
                            resultUnit: {
                                "type": "string",
                                "description": "Unit of the test result corresponding to the parameterName"
                            },
                            resultValue: {
                                "type": "string",
                                "description": "Test result value corresponding to the parameterName"
                            },
                            reference: {
                                "type": "string",
                                "description": "Reference value with unit from the 'Tiêu chuẩn cơ sở sản phẩm' (Product Specification) document, if available (e.g., '5.0-7.0 pH' for pH test, 'Not detected' for Hg test); not included if no specification is provided"
                            },
                            conclusion: {
                                "type": "string",
                                "description": "Test conclusion (e.g., 'Đạt', 'Không đạt', 'Pass', 'Fail') if available"
                            }
                        },
                        required: ["parameterName", "protocolCode", "resultValue", "resultUnit"]
                    }
                },
                legal: {
                    type: 'object',
                    properties: {
                        legalStatus: {
                            type: 'string',
                            description: 'Legal status of the document. Legal bound only if not draft, valid ref number and date, signed and stamped by an Authorized person. Select the closest status from the list',
                            enum: ['UNKNOWN', 'LEGAL_HOLD', 'NOT_LEGAL', 'DRAFT', 'WITHDRAWN', 'EXPIRED', 'UNSIGNED'],
                            default: 'UNKNOWN'
                        },
                        legalSigners: {
                            type: 'array',
                            description: "List of signers",
                            items: {
                                type: 'object',
                                properties: {
                                    name: { type: 'string', description: 'The name of the person who signed. Null if unsigned' },
                                    position: { type: 'string', description: 'The position of the signer. Null if unsigned' },
                                    isStamped: { type: 'boolean', description: 'True if the stamp is present on this signature. Null if unsigned' }
                                }
                            }
                        },
                    }
                }
            }
        }
    }]


const entities = global.get('entities.js') || {};
entities.DocAgent = DocAgent;
entities.CLASSIFIER_CODES = CLASSIFIER_CODES;
node.status({ fill: 'green', shape: 'ring', text: 'OK' });
return msg;