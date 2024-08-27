import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { S3, ApiGatewayManagementApi, Lambda } from 'aws-sdk';
import axios from 'axios';

const s3 = new S3();
const lambda = new Lambda();

export async function handler(
  event: APIGatewayProxyEvent,
  context: Context
): Promise<APIGatewayProxyResult> {
  const lambdaRequestId = context.awsRequestId;
  const apiRequestId = event.requestContext.requestId;
  const connectionId = event.requestContext.connectionId;
  const domainName = event.requestContext.domainName;
  const stage = event.requestContext.stage;

  console.log(
    `API Gateway RequestId ${apiRequestId} - Lambda RequestId ${lambdaRequestId}`
  );

  const documentId = parseInt(event.queryStringParameters?.document_id ?? '0');
  const year = parseInt(event.queryStringParameters?.year ?? '0');

  if (!documentId || !year) {
    await sendMessageToClient(connectionId!, domainName!, stage!, { 
      error: "Missing query parameters" 
    });
    return { statusCode: 400, body: 'Missing query parameters' };
  }

  console.log(`document_id: ${documentId}, year: ${year}`);

  try {
    const documentExists = await checkDocumentExists(documentId, year);

    if (documentExists) {
      const signedUrl = generateSignedUrl(documentId, year);
      await sendMessageToClient(connectionId!, domainName!, stage!, { 
        fileExists: true, 
        url: signedUrl 
      });
    } else {
      await sendMessageToClient(connectionId!, domainName!, stage!, { 
        message: 'Generating file...' 
      });

      // Call generate file Lambda
      await lambda.invoke({
        FunctionName: process.env.GENERATE_FILE_LAMBDA!,
        InvocationType: 'Event',
        Payload: JSON.stringify({ documentId, year, connectionId, domainName, stage })
      }).promise();
    }

    return { statusCode: 200, body: 'OK' };
  } catch (error) {
    console.error('Error:', error);
    await sendMessageToClient(connectionId!, domainName!, stage!, { 
      error: 'Error processing request' 
    });
    return { statusCode: 500, body: 'Error processing request' };
  }
}

async function checkDocumentExists(documentId: number, year: number): Promise<boolean> {
  try {
    await s3.headObject({
      Bucket: process.env.SOURCE_BUCKET!,
      Key: `${documentId}-${year}.pdf`,
    }).promise();

    console.log(`Document ${documentId}-${year}.pdf exists in S3.`);
    return true;
  } catch (error) {
    if ((error as any).code === 'NotFound') {
      console.log(`Document ${documentId}-${year}.pdf not found in S3.`);
      return false;
    } else {
      console.error('Error checking document in S3:', error);
      throw error;
    }
  }
}

function generateSignedUrl(documentId: number, year: number): string {
  const params = {
    Bucket: process.env.SOURCE_BUCKET!,
    Key: `${documentId}-${year}.pdf`,
    Expires: 60 * 5, // Valid for 5 minutes
  };
  return s3.getSignedUrl('getObject', params);
}

async function sendMessageToClient(connectionId: string, domainName: string, stage: string, payload: any) {
  const apiGateway = new ApiGatewayManagementApi({
    apiVersion: '2018-11-29',
    endpoint: `${domainName}/${stage}`
  });

  await apiGateway.postToConnection({
    ConnectionId: connectionId,
    Data: JSON.stringify(payload)
  }).promise();
}