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
  const documentId = event.queryStringParameters?.document_id;
  const year = event.queryStringParameters?.year;

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
      const document = await getDocument(documentId, year);

      if (document) {
        // Retorna o arquivo encontrado no S3
        return {
          statusCode: 200,
          headers: {
            "Content-Type": "application/pdf", // Definindo o tipo de conteúdo do PDF
            "Content-Disposition": `attachment; filename="${documentId}-${year}.pdf"`, // Força o download do arquivo
          },
          body: document.toString('base64'), // Converte o buffer do arquivo em base64 para envio via API Gateway
          isBase64Encoded: true, // Indica que o corpo da resposta está codificado em base64
        };
      } else {
        // Se o documento não existir, chama a API externa
        const apiUrl = `https://mbalucas.requestcatcher.com/test?document_id=${documentId}&year=${year}`;
        const response = await axios.get(apiUrl);

        console.log("API externa chamada com sucesso:", response.data);

        // Retorna uma mensagem de que o documento está sendo criado
        return {
          statusCode: 202,
          body: JSON.stringify({
            message: "Document is being generated. Please try again later.",
          }),
        };
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

async function getDocument(documentId: string, year: string): Promise<Buffer | null> {
  try {
    const response = await s3
      .getObject({
        Bucket: bucketName,
        Key: `${documentId}-${year}.pdf`,
      })
      .promise();

    console.log("Document retrieved from S3:", response);

    return response.Body as Buffer;
  } catch (error) {
    if ((error as any).code === "NoSuchKey") {
      console.log(`Document ${documentId}-${year}.pdf not found in S3.`);
      return null; // Documento não encontrado
    } else {
      console.error("Error getting document from S3:", error);
      throw error; // Lança erro se for outra exceção
    }
  }
}
