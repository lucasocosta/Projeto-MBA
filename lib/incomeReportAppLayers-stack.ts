import * as lambda from "aws-cdk-lib/aws-lambda";
import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as ssm from "aws-cdk-lib/aws-ssm";


export class IncomeReportAppLayersStack extends cdk.Stack {
    readonly incomeReportLayers: lambda.LayerVersion;

    constructor(scope: Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props);

        this.incomeReportLayers = new lambda.LayerVersion(this, "incomeReportLayer", {
            code: lambda.Code.fromAsset('lambda/products/layers/incomeReportLayer'),
            compatibleRuntimes: [lambda.Runtime.NODEJS_20_X],
            layerVersionName: "incomeReportLayer",
            removalPolicy: cdk.RemovalPolicy.RETAIN
        });
        new ssm.StringParameter(this, "incomeReportLayerVersionArn", {
            parameterName: "incomeReportLayerVersionArn",
            stringValue: this.incomeReportLayers.layerVersionArn
        });
    }
}