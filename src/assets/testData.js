// Assuming these are globally available utility functions and entities
const { Gemini, UniFile, TemporaryAnalysisResult, Analysis } = global.get('entities.js');
const { convertSnakeCase } = global.get('utilities.js');
const { reqSession } = global.get('identity.js');

// API Request Headers
const REQ_HEADERS = {
    'x-fh-app-uid': 'LIMS-IRDOP-PRD',
    'authorization': `Bearer sx_ae946b5effdd47c99f19609562b9482464a7a8f8cbd04252a30122d57f1017c780cb0ea816a8445696bc0221fb67`, // Replace with your actual token management
};

// Define document types with English names and clear descriptions
const DOC_TYPES = [
    { code: 'ANH_MAU', name: 'Sample Image', description: 'Image of the sample/product being tested.' },
    { code: 'PHIEU_GUI_MAU', name: 'Sample Request Form', description: 'Form detailing client, sample, and requested tests.' },
    { code: 'DON_HANG', name: 'Purchase Order', description: 'Document titled "ĐƠN HÀNG".' },
    { code: 'BAO_GIA', name: 'Quotation', description: 'Document titled "BÁO GIÁ".' },
    { code: 'PHIEU_KET_QUA_THU_NGHIEM', name: 'Certificate of Analysis', description: 'Official test results report with client, sample, and result details.' },
    { code: 'BIEN_BAN_KET_QUA_THU_NGHIEM', name: 'Test Result Report', description: 'A report containing test results, typically without client information.' },
    { code: 'BIEN_BAN_BAN_GIAO_MAU', name: 'Sample Delivery Report', description: 'Sample handover document specifying recipient and tests.' },
    { code: 'TIEU_CHUAN_CO_SO_SAN_PHAM', name: 'Product Specification', description: 'Client-provided document with standard specifications for the sample.' },
    { code: 'TAI_LIEU_KHAC', name: 'Other Document', description: 'Any document not matching the other categories.' },
];

/**
 * Gemini configuration for document classification.
 */
const DOC_CLASSIFICATION_CONFIG = {
    name: 'Document_Classification_v2',
    model: 'gemini-2.0-flash',
    systemPrompt: `You are an AI expert in classifying laboratory documents.
    Analyze the file and classify it into one of the following categories:
    ${DOC_TYPES.map(doc => `- Code: ${doc.code}, Name: ${doc.name}, Description: ${doc.description}`).join('\n')}
    Respond ONLY with a JSON array of the matched category object(s) in the format: [{"code": "CODE", "name": "NAME"}]`,
    parseFunction: Gemini.parseJson,
};

/**
 * Gemini configuration for extracting analysis results from a test report.
 */
const ANALYSIS_RESULT_EXTRACTION_CONFIG = {
    name: 'Analysis_Result_Extraction_v1',
    model: 'gemini-1.5-flash',
    prompt: `You are a highly specialized AI for extracting data from Vietnamese laboratory reports.
    
    Your task is to meticulously analyze the provided file and convert all data from result tables into a single, structured JSON array based on the schema. Follow these rules with precision.

    **Extraction Rules:**
    1.  **'sampleUID'**: Extract from the 'Mã mẫu' column. It must match the format 'SP' + YY + character + DDMM + '-XX'.
    2.  **'parameterName'**: Find the name of the test or analyte. Look for it in the table row itself (e.g., 'Chỉ tiêu' column), in the main title of the test on the page, or in the document header.
    3.  **'id'**: Extract the number from the 'Mã CT', 'ID', or 'Mã chỉ tiêu' column.
    4.  **Dynamic Units**: The 'resultUnit' for each row can be different. Determine the unit for each result individually by examining its specific column header or other context within the table. A unit is always required.
    5.  **Decimal Separator**: For ALL numerical results, the decimal separator MUST be a comma (','). For example, '0.04' must be returned as '0,04'.
    6.  **HTML Formatting**: Format 'resultValue' and 'resultUnit' as HTML strings. Use '<sup>' for superscripts, '<sub>' for subscripts, and '&times;' for the multiplication symbol.`,
    jsonSchema: {
        "type": "array",
        "items": {
            "type": "object",
            "properties": {
                "sampleUID": {
                    "type": "string",
                    "description": "The unique sample identifier from the 'Mã mẫu' column. Must follow the pattern: SP<YY><char><DDMM>-<XX>, e.g., SP25r0707-01."
                },
                "id": {
                    "type": "integer",
                    "description": "The numeric ID from the 'Mã CT', 'ID', or 'Mã chỉ tiêu' column."
                },
                "parameterName": {
                    "type": "string",
                    "description": "Name of the test/analyte, found in the table, test title, or document header."
                },
                "resultValue": {
                    "type": "string",
                    "description": "The result value, formatted as an HTML string. Must use a comma (,) as the decimal separator for numbers."
                },
                "resultUnit": {
                    "type": "string",
                    "description": "The specific unit for the result row, derived from its column header or context. This field cannot be empty."
                }
            },
            "required": ["sampleUID", "id", "parameterName", "resultValue", "resultUnit"]
        }
    },
    parseFunction: Gemini.parseJson,
};

/**
 * Classifies a document and, if applicable, extracts structured data from it.
 * @param {string} fileId The ID of the file to process.
 * @param {object} session The user session object.
 * @returns {Promise<object>} The result of the operation.
 */
async function classifyAndExtractDoc(fileId, session) {
    // 1. Classify the document
    const gem = await Gemini.getGemini({
        model: 'gemini-2.0-flash',
        botConfig: env.get('BOT_CONFIG')['botfather@irdop.org'],
    });

    const result = await gem.genContent(`classify this file accordingly to your system instruction, response json only: \n${DOC_CLASSIFICATION_CONFIG.systemPrompt}`, [fileId]);
    const systemTags = Gemini.parseJson(result);

    if (systemTags.success) {
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
        node.warn({ updatedUserTags })
        // Update the file with the merged tags
        await uniFile.updateFile({
            systemTags: updatedSystemTags,
            userTags: updatedUserTags
        });
    }

    // 2. If the document is a Test Result Report, extract its data
    for (const docType of systemTags.json) {
        if (docType?.code === 'BIEN_BAN_KET_QUA_THU_NGHIEM') {
            // Note: Pass schema to a dedicated parameter if the API supports it, or enable JSON mode.
            // Do not stringify the schema into the prompt itself.
            const extractionResponse = await gem.genContent(
                ANALYSIS_RESULT_EXTRACTION_CONFIG.prompt,
                [fileId],
                { response_mime_type: 'application/json', response_schema: ANALYSIS_RESULT_EXTRACTION_CONFIG.jsonSchema }
            );

            const extractionResult = ANALYSIS_RESULT_EXTRACTION_CONFIG.parseFunction(extractionResponse);

            if (extractionResult.success) {
                let temporaryResults = extractionResult.json;
                node.warn({ temporaryResults });

                // Ensure temporaryResults is an array
                temporaryResults = Array.isArray(temporaryResults) ? temporaryResults : [temporaryResults];
                // Add fileId to each result object
                temporaryResults = temporaryResults.map(result => ({
                    ...result,
                    fileId
                }));
                node.warn({ temporaryResults });

                const uniFile = await UniFile.getFile(fileId, session);
                
                const listAnalysisResult = await TemporaryAnalysisResult.insertOrUpdateBulkTemporaryResult({ analysisResults: temporaryResults }, session);
                const updateFileIdAnalysis = await Analysis.updateBulkFileId({analyses:temporaryResults}, session);
                // Update foreignKeyUIDs with sampleUids from all results
                const existingForeignKeyUIDs = uniFile.foreignKeyUIDs || [];
                const newSampleUids = listAnalysisResult.result
                    .map(result => result.sampleUid)
                    .filter(sampleUid => sampleUid && !existingForeignKeyUIDs.includes(sampleUid));
                
                const updatedForeignKeyUIDs = [...existingForeignKeyUIDs, ...new Set(newSampleUids)];

                await uniFile.updateFile({
                    processingStatus: 'PENDING_APPROVAL',
                    foreignKeyUIDs: updatedForeignKeyUIDs
                });

                return {
                    data: listAnalysisResult.data,
                    pagination: listAnalysisResult.pagination
                };
            }
        }
    }

    return {
        data: systemTags.json,
        pagination: {
            currentPage: 1,
            itemsPerPage: systemTags.json.length,
            totalItems: systemTags.json.length,
            totalPages: 1
        }
    };
}
    try {
        const session = await reqSession({ headers: REQ_HEADERS });
        const fileIds =  [
                "file_c3aa17d75a7",
                "file_e9df1e5fdbe",
                "file_c6501370b0f",
                "file_2ea2260f8e8"
            ];
        
        const results = await classifyAndExtractDoc(fileIds[0], session);
        node.warn({ results });
        msg.payload = results
    } catch (error) {
        node.warn(error.stack);
    }

    return msg;