import {
  APIGatewayProxyEvent,
  APIGatewayProxyResult,
  Context,
} from "aws-lambda";

export async function handler(
  event: APIGatewayProxyEvent,
  context: Context
): Promise<APIGatewayProxyResult> {
  const lambdaRequestId = context.awsRequestId;
  const apiRequestId = event.requestContext.requestId;

  console.log(
    `API Gateway RequestId ${apiRequestId} - Lambda RequestId ${lambdaRequestId}`
  );

  if (event.resource === "/lambda2") {
    console.log("GET /lambda2");
    return {
      statusCode: 200,
      body: JSON.stringify('LAMBA 2'),
    };
  }

  return {
    statusCode: 400,
    body: JSON.stringify({ message: "Error getting lambda" }),
  };
}