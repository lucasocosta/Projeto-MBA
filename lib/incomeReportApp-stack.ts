import * as lambda from "aws-cdk-lib/aws-lambda";
import * as lambdaNodeJS from "aws-cdk-lib/aws-lambda-nodejs";
import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as ssm from "aws-cdk-lib/aws-ssm";
import * as s3 from "aws-cdk-lib/aws-s3"
import * as iam from "aws-cdk-lib/aws-iam"
import * as sns from "aws-cdk-lib/aws-sns"
import * as subs from "aws-cdk-lib/aws-sns-subscriptions"

export class IncomeReportAppStack extends cdk.Stack {
  readonly filePollerHandler: lambdaNodeJS.NodejsFunction;
  readonly incomeReportHandler: lambdaNodeJS.NodejsFunction;
  readonly balanceHandler: lambdaNodeJS.NodejsFunction;
  readonly htmlToPdfHandler: lambdaNodeJS.NodejsFunction;
  readonly htmlHandler: lambdaNodeJS.NodejsFunction;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const incomeReportLayerArn = ssm.StringParameter.valueForStringParameter(this, "incomeReportLayerVersionArn");
    const incomeReportLayer = lambda.LayerVersion.fromLayerVersionArn(this, "incomeReportLayerVersionArn", incomeReportLayerArn);

    const filesTopic = new sns.Topic(this, "FilesEventsTopic", {
      displayName: "Files events topic",
      topicName: "files-events"
   })

    // Criando o bucket S3
    const incomeReportBucket = new s3.Bucket(this, "incomeReportBucket", {
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      lifecycleRules: [
        {
          enabled: true,
          expiration: cdk.Duration.days(1),
        },
      ],
    });

    const htmlToPdfBucket = new s3.Bucket(this, "htmlToPdfBucket", {
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      lifecycleRules: [
        {
          enabled: true,
          expiration: cdk.Duration.days(1),
        },
      ],
    });

    // Política de IAM para permitir que a Lambda acesse o bucket S3
    const incomeReportBucketPolicy = new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        's3:PutObject',
        's3:GetObject',
        's3:DeleteObject',
        's3:GetObjectAcl',
        's3:ListBucket',
      ],
      resources: [
        incomeReportBucket.bucketArn,
        `${incomeReportBucket.bucketArn}/*`,
      ],
    });

    const htmlToPdfBucketPolicy = new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        's3:PutObject',
        's3:GetObject',
        's3:DeleteObject',
        's3:GetObjectAcl',
        's3:ListBucket',
      ],
      resources: [
        htmlToPdfBucket.bucketArn,
        `${htmlToPdfBucket.bucketArn}/*`,
      ],
    });

    // Criando a função Lambda filePollerHandler
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
        layers: [incomeReportLayer],
        environment: {
          BUCKET_NAME: incomeReportBucket.bucketName, // Passando o nome do bucket
          BUCKET_NAME_HTML_TO_PDF: htmlToPdfBucket.bucketName,
          FILES_EVENTS_TOPIC_ARN: filesTopic.topicArn,
        },
      }
    );
    this.filePollerHandler.addToRolePolicy(incomeReportBucketPolicy);
    this.filePollerHandler.addToRolePolicy(htmlToPdfBucketPolicy);
    filesTopic.addSubscription(new subs.LambdaSubscription(this.filePollerHandler))

    // Criando a função Lambda incomeReportHandler
    this.incomeReportHandler = new lambdaNodeJS.NodejsFunction(
      this,
      "incomeReportFunction",
      {
        functionName: "incomeReportFunction",
        entry: "lambda/products/incomeReportFunction.ts",
        handler: "handler",
        memorySize: 256, // Aumentado de 128 MB para 256 MB
        timeout: cdk.Duration.seconds(10), // Aumentado de 5 para 10 segundos
        bundling: {
          minify: true,
          sourceMap: false,
        },
        layers: [incomeReportLayer],
        environment: {
          BUCKET_NAME: incomeReportBucket.bucketName,
          BUCKET_NAME_HTML_TO_PDF: htmlToPdfBucket.bucketName,
        },
      }
    );
    this.incomeReportHandler.addToRolePolicy(incomeReportBucketPolicy);
    this.incomeReportHandler.addToRolePolicy(htmlToPdfBucketPolicy);

    this.balanceHandler = new lambdaNodeJS.NodejsFunction(
      this,
      "balanceFunction",
      {
        functionName: "balanceFunction",
        entry: "lambda/products/balanceFunction.ts",
        handler: "handler",
        memorySize: 128, // Aumentado de 128 MB para 256 MB
        timeout: cdk.Duration.seconds(10), // Aumentado de 5 para 10 segundos
        bundling: {
          minify: true,
          sourceMap: false,
        },
        layers: [incomeReportLayer],
      }
    );
    this.balanceHandler.addToRolePolicy(incomeReportBucketPolicy);
    this.balanceHandler.addToRolePolicy(htmlToPdfBucketPolicy);

    this.htmlToPdfHandler = new lambdaNodeJS.NodejsFunction(
      this,
      "htmlToPdfFunction",
      {
        functionName: "htmlToPdfFunction",
        entry: "lambda/products/htmlToPdfFunction.ts",
        handler: "handler",
        memorySize: 512, // Aumentado de 128 MB para 256 MB
        timeout: cdk.Duration.seconds(60), // Aumentado de 5 para 10 segundos
        bundling: {
          minify: true,
          sourceMap: false,
        },
        layers: [incomeReportLayer],
        environment: {
          BUCKET_NAME_HTML_TO_PDF: htmlToPdfBucket.bucketName,
          FILES_EVENTS_TOPIC_ARN: filesTopic.topicArn,
        },
      }
    );
    this.htmlToPdfHandler.addToRolePolicy(incomeReportBucketPolicy);
    this.htmlToPdfHandler.addToRolePolicy(htmlToPdfBucketPolicy);
    htmlToPdfBucket.grantPut(this.htmlToPdfHandler);
    filesTopic.grantPublish(this.htmlToPdfHandler)

    this.htmlHandler = new lambdaNodeJS.NodejsFunction(
      this,
      "htmlFunction",
      {
        functionName: "htmlFunction",
        entry: "lambda/products/htmlFunction.ts",
        handler: "handler",
        memorySize: 128, // Aumentado de 128 MB para 256 MB
        timeout: cdk.Duration.seconds(10), // Aumentado de 5 para 10 segundos
        bundling: {
          minify: true,
          sourceMap: false,
        },
        layers: [incomeReportLayer],
      }
    );
  }
}
