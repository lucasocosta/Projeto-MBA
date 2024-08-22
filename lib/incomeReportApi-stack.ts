import * as lambdaNodeJS from "aws-cdk-lib/aws-lambda-nodejs";
import * as cdk from "aws-cdk-lib";
import * as apigateway from "aws-cdk-lib/aws-apigateway";
import * as cwlogs from "aws-cdk-lib/aws-logs";
import { Construct } from "constructs";

interface IncomeReportApiStackProps extends cdk.StackProps {
  filePollerHandler: lambdaNodeJS.NodejsFunction;
  incomeReportHandler: lambdaNodeJS.NodejsFunction;
  balanceHandler: lambdaNodeJS.NodejsFunction;
  htmlToPdfHandler: lambdaNodeJS.NodejsFunction;

}

export class IncomeReportApiStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: IncomeReportApiStackProps) {
    super(scope, id, props);

    const logGroup = new cwlogs.LogGroup(this, "IncomeReportApiLogs");

    const api = new apigateway.RestApi(this, "IncomeReportApi", {
      restApiName: "IncomeReportApi",
      cloudWatchRole: true,
      deployOptions: {
        accessLogDestination: new apigateway.LogGroupLogDestination(logGroup),
        accessLogFormat: apigateway.AccessLogFormat.jsonWithStandardFields({
          httpMethod: true,
          ip: true,
          protocol: true,
          requestTime: true,
          resourcePath: true,
          responseLength: true,
          status: true,
          caller: true,
          user: true,
        }),
      },
    });

    //lambdas
    const filePollerHandlerIntegration = new apigateway.LambdaIntegration(
      props.filePollerHandler
    );
    const incomeReportHandlerIntegration = new apigateway.LambdaIntegration(
      props.incomeReportHandler
    );
    const balanceHandlerIntegration = new apigateway.LambdaIntegration(
      props.balanceHandler
    );
    const htmlToPdfHandlerIntegration = new apigateway.LambdaIntegration(
      props.htmlToPdfHandler
    );



    const incomeReportHandlerResource = api.root.addResource("lambda1");
    const filePolerHandlerResource = api.root.addResource("lambda2");
    const balanceResource = api.root.addResource("balance");
    const htmlToPdfResource = api.root.addResource("htmlToPdf");
    incomeReportHandlerResource.addMethod("GET", incomeReportHandlerIntegration);
    filePolerHandlerResource.addMethod("GET", filePollerHandlerIntegration);
    balanceResource.addMethod("GET", balanceHandlerIntegration);
    htmlToPdfResource.addMethod("POST", htmlToPdfHandlerIntegration);
    
  }
}
