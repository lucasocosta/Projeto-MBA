import * as lambdaNodeJS from "aws-cdk-lib/aws-lambda-nodejs";
import * as cdk from "aws-cdk-lib";
import * as apigateway from "aws-cdk-lib/aws-apigateway";
import * as cwlogs from "aws-cdk-lib/aws-logs";
import { Construct } from "constructs";
import * as apigatewayv2 from 'aws-cdk-lib/aws-apigatewayv2';
import * as apigatewayv2_integrations from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as s3 from "aws-cdk-lib/aws-s3";

interface IncomeReportWSApiStackProps extends cdk.StackProps {
  verifyFileHandler: lambdaNodeJS.NodejsFunction;
}

export class IncomeReportWSApiStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: IncomeReportWSApiStackProps) {
    super(scope, id, props);

    const logGroup = new cwlogs.LogGroup(this, "IncomeReportWSApiLogs");

    // Create WebSocket API
    //WebSocket connection handler
    const connectionHandler = new lambdaNodeJS.NodejsFunction(this, "IncomeReportConnectionFunction", {
      functionName: "IncomeReportConnectionFunction",
      entry: "lambda/products/incomeReportConnectionFunction.ts",
      handler: "handler",
      memorySize: 512,
      timeout: cdk.Duration.seconds(2),
      bundling: {
        minify: true,
        sourceMap: false
      },
      runtime: lambda.Runtime.NODEJS_20_X
    })

    //WebSocket disconnection handler
    const disconnectionHandler = new lambdaNodeJS.NodejsFunction(this, "IncomeReportDisconnectionFunction", {
      functionName: "IncomeReportDisconnectionFunction",
      entry: "lambda/products/incomeReportDisconnectionFunction.ts",
      handler: "handler",
      memorySize: 512,
      timeout: cdk.Duration.seconds(2),
      bundling: {
        minify: true,
        sourceMap: false
      },
      runtime: lambda.Runtime.NODEJS_20_X
    })

    const webSocketApi = new apigatewayv2.WebSocketApi(this, "IcomeReportWSApi", {
      apiName: "IncomeReportWSApi",
      connectRouteOptions: {
        integration:
          new apigatewayv2_integrations.WebSocketLambdaIntegration("ConnectionHandler", connectionHandler)
      },
      disconnectRouteOptions: {
        integration:
          new apigatewayv2_integrations.WebSocketLambdaIntegration("DisconnectionHandler", disconnectionHandler)
      }
    });

    const stage = "prod"
    const wsApiEndpoint = `${webSocketApi.apiEndpoint}/${stage}`
    new apigatewayv2.WebSocketStage(this, "IncomeReportWSApiStage", {
       webSocketApi: webSocketApi,
       stageName: stage,
       autoDeploy: true
    });

    // Add verify file route
    webSocketApi.addRoute('verifyFile', {
      integration: new apigatewayv2_integrations.WebSocketLambdaIntegration(
        "VerifyFileHandler", 
        props.verifyFileHandler
      )
    });

    // Grant permissions
    webSocketApi.grantManageConnections(props.verifyFileHandler);

    // Pass WebSocket API endpoint to handler
    props.verifyFileHandler.addEnvironment('WEBSOCKET_API_ENDPOINT', wsApiEndpoint);

    //lambdas


    // Add WebSocket API endpoint output
    new cdk.CfnOutput(this, 'WebSocketApiEndpoint', {
      value: wsApiEndpoint,
      description: 'WebSocket API Endpoint',
    });
  }
}