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
  const method = event.httpMethod;

  console.log(
    `API Gateway RequestId ${apiRequestId} - Lambda RequestId ${lambdaRequestId}`
  );

  if (event.resource === "/lambda1") {
    const productId = event.pathParameters!.id as string;
    console.log(`{${method} lamda1`);

    return {
      statusCode: 200,
      body: JSON.stringify('lamda1'),
    };
  }

  return {
    statusCode: 400,
    body: JSON.stringify({ message: "Error" }),
  };
}
