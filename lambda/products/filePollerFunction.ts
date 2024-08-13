import {
  APIGatewayProxyEvent,
  APIGatewayProxyResult,
  Context,
} from "aws-lambda";
import S3 = require("aws-sdk/clients/s3");

const bucketName = process.env.BUCKET_NAME!;
const htmlToPdfBucket = process.env.BUCKET_NAME_HTML_TO_PDF!;
const s3 = new S3();

export async function handler(
  event: APIGatewayProxyEvent,
  context: Context
): Promise<APIGatewayProxyResult> {
  const lambdaRequestId = context.awsRequestId;
  const apiRequestId = event.requestContext.requestId;
  const documentId = event.queryStringParameters?.document_id;
  const year = event.queryStringParameters?.year;

  console.log(
    `API Gateway RequestId ${apiRequestId} - Lambda RequestId ${lambdaRequestId}`
  );

  console.log(
    `API BUCKET ${bucketName} - Lambda RequestId ${lambdaRequestId}`
  );

  if (event.resource === "/lambda2") {
    console.log("GET /lambda2");

    const sourceKey = `${documentId}-${year}.pdf`;
    const destinationKey = `${documentId}-${year}.pdf`;

    try {
      // Verifica se o arquivo existe no bucket destino
      await s3
        .headObject({
          Bucket: bucketName,
          Key: destinationKey,
        })
        .promise();

      console.log(`File already exists in destination bucket: ${bucketName}`);
    } catch (headError) {
      if ((headError as any).code === 'NotFound') {
        // Se o arquivo não existe, faz a cópia do bucket htmlToPdf para o bucket destino
        try {
          await s3
            .copyObject({
              CopySource: `${htmlToPdfBucket}/${sourceKey}`,
              Bucket: bucketName,
              Key: destinationKey,
            })
            .promise();

          console.log(`File copied from ${htmlToPdfBucket} to ${bucketName}`);
        } catch (copyError) {
          console.error("Error copying file:", copyError);
          return {
            statusCode: 500,
            body: JSON.stringify({ message: "Error copying file" }),
          };
        }
      } else {
        console.error("Error checking file existence:", headError);
        return {
          statusCode: 500,
          body: JSON.stringify({ message: "Error checking file existence" }),
        };
      }
    }

    return {
      statusCode: 200,
      body: JSON.stringify('File check and copy operation completed.'),
    };
  }

  return {
    statusCode: 400,
    body: JSON.stringify({ message: "Invalid resource path" }),
  };
}
