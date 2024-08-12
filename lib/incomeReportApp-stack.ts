import * as lambda from "aws-cdk-lib/aws-lambda";
import * as lambdaNodeJS from "aws-cdk-lib/aws-lambda-nodejs";
import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as ssm from "aws-cdk-lib/aws-ssm";

export class IncomeReportAppStack extends cdk.Stack {
  readonly filePollerHandler: lambdaNodeJS.NodejsFunction;
  readonly incomeReportHandler: lambdaNodeJS.NodejsFunction;
  
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const incomeReportLayerArn = ssm.StringParameter.valueForStringParameter(this, "incomeReportLayerVersionArn");
    const incomeReportLayer = lambda.LayerVersion.fromLayerVersionArn(this, "incomeReportLayerVersionArn", incomeReportLayerArn);

    this.filePollerHandler = new lambdaNodeJS.NodejsFunction(
      this,
      "filePollerFunction",
      {
        functionName: "filePollerFunction",
        entry: "lambda/products/filePollerFunction.ts",
        handler: "handler",
        memorySize: 128,
        timeout: cdk.Duration.seconds(5),
        bundling: {
          minify: true,
          sourceMap: false,
        },
        layers: [incomeReportLayer]
      }
    );

    this.incomeReportHandler = new lambdaNodeJS.NodejsFunction(
      this,
      "incomeReportFunction",
      {
        functionName: "incomeReportFunction",
        entry: "lambda/products/incomeReportFunction.ts",
        handler: "handler",
        memorySize: 128,
        timeout: cdk.Duration.seconds(5),
        bundling: {
          minify: true,
          sourceMap: false,
        },
        layers: [incomeReportLayer]
      }
    );
  }
}
