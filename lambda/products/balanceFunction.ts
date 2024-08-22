import {
    APIGatewayProxyEvent,
    APIGatewayProxyResult,
    Context,
  } from "aws-lambda";
import { randomInt } from "crypto";

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
  
    if (event.resource === "/balance") {
      console.log("GET /balance");
      
      if (!documentId || !year) {
        return {
          statusCode: 400,
          body: JSON.stringify({ message: "Missing query parameters" }),
        };
      }
      let balance = randomInt(1000);
  
      return {
        statusCode: 200,
        body: JSON.stringify({ documentId, year, balance }),
      };
    }
  
    return {
      statusCode: 400,
      body: JSON.stringify({ message: "Invalid resource path" }),
    };
  }
  