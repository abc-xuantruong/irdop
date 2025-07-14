const table = global.get('table');


async function getAnalysis() {
	try {
		const { listIds } = msg.req.body;
		const analyses = [];
		for(const id of listIds){
		    const analysis = await table.getAnalysis(id);
			if(analysis){
				analyses.push(analysis);
			}else{
				analyses.push({ id});
			}
		}
		msg.payload = analyses;
	} catch (error) {
		node.warn(error);
		msg.statusCode = 400;
	}
}

await getAnalysis();


return msg;
