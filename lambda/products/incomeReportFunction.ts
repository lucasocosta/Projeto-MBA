import {
  APIGatewayProxyEvent,
  APIGatewayProxyResult,
  Context,
} from "aws-lambda";
import axios from "axios";
import S3 = require("aws-sdk/clients/s3");

const bucketName = process.env.BUCKET_NAME!;
const s3 = new S3();

export async function handler(
  event: APIGatewayProxyEvent,
  context: Context
): Promise<APIGatewayProxyResult> {
  const lambdaRequestId = context.awsRequestId;
  const apiRequestId = event.requestContext.requestId;
  const method = event.httpMethod;

  console.log(
    `API Gateway RequestId ${apiRequestId} - Lambda RequestId ${lambdaRequestId}`
  );

  // Recebendo os query params
  const documentId = parseInt(event.queryStringParameters?.document_id ?? '0');
  const year = parseInt(event.queryStringParameters?.year ?? '0');

  if (event.resource === "/lambda1") {
    console.log(`${method} lambda1`);
    console.log(`document_id: ${documentId}, year: ${year}`);

    // Verificando se os parâmetros foram fornecidos
    if (!documentId || !year) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: "Missing query parameters" }),
      };
    }

    try {
      // Verifica se o documento já existe no S3
      const documentExists = await checkDocumentExists(documentId, year);

      if (documentExists) {
        // Retorna a URL assinada para o arquivo encontrado no S3
        const signedUrl = generateSignedUrl(documentId, year);
        return {
          statusCode: 200,
          body: JSON.stringify({ url: signedUrl }),
        };
      } else {
        // Se o documento não existir, chama a API externa
        const apiUrl = `https://vd27ypep8i.execute-api.us-east-1.amazonaws.com/prod/balance?document_id=${documentId}&year=${year}`;
        const response = await axios.get(apiUrl);

        console.log("API externa chamada com sucesso:", response.data);

        const apiUrl2 = `https://vd27ypep8i.execute-api.us-east-1.amazonaws.com/prod/htmlToPdf`;
        const response2 = await axios.post(apiUrl2, { documentId, year, balance: response.data.balance });

        console.log("API externa chamada com sucesso:", response2.data);

        // Polling to check if the document has been created in S3
        for (let i = 0; i < 5; i++) {
          const documentExists = await checkDocumentExists(documentId, year);
          if (documentExists) {
            const signedUrl = generateSignedUrl(documentId, year);
            return {
              statusCode: 200,
              body: JSON.stringify({ url: signedUrl }),
            };
          }
          await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second before checking again
        }
      }
    } catch (error) {
      console.error("Error processing the request:", error);
      return {
        statusCode: 500,
        body: JSON.stringify({ message: "Internal Server Error" }),
      };
    }
  }

  return {
    statusCode: 400,
    body: JSON.stringify({ message: "Invalid resource path" }),
  };
}

async function checkDocumentExists(documentId: number, year: number): Promise<boolean> {
  try {
    await s3
      .headObject({
        Bucket: bucketName,
        Key: `${documentId}-${year}.pdf`,
      })
      .promise();

    console.log(`Document ${documentId}-${year}.pdf exists in S3.`);
    return true;
  } catch (error) {
    if ((error as any).code === "NotFound") {
      console.log(`Document ${documentId}-${year}.pdf not found in S3.`);
      return false;
    } else {
      console.error("Error checking document in S3:", error);
      throw error;
    }
  }
}

function generateSignedUrl(documentId: number, year: number): string {
  const params = {
    Bucket: bucketName,
    Key: `${documentId}-${year}.pdf`,
    Expires: 60 * 5, // URL válida por 5 minutos
  };
  return s3.getSignedUrl('getObject', params);
}
