const templateData ={
    result: [
        {
        	id: int,
        	receipt_uid: string,
        	samples:[
                {
            		id: int,
            		sample_uid: string,
            		sample_name: string,
            		matrix: string,
            		sample_description: string,
            		additional_request: string,
            		status: int,
            		analysis: [
                        {
                            id: int,
                            parameter_name: string,
                            protocol_source: string,
                            protocol_code: string,
                            field: string,
                            result_value: string,
                            result_unit: string,
                            deadline: timestamp,
                            technician_uid: string,
                            ex_info: {
                                ex_name: string,
                                send_at: timestamp,
                            },
                            submit_result_by: string
                        }
                    ]
                }
            ]
        }
    ],
    pagination: {
        currentPage: int,
        itemsPerPage: int,
        totalItems: int,
        totalPages: int
    }
} 