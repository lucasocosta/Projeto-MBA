#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import { IncomeReportAppLayersStack } from "../lib/incomeReportAppLayers-stack";
import { IncomeReportAppStack } from "../lib/incomeReportApp-stack";
import { IncomeReportApiStack } from "../lib/incomeReportApi-stack";
import { IncomeReportWSApiStack } from "../lib/incomeReportWSApi-stack";

const app = new cdk.App();
const env: cdk.Environment = {
  account: "352268968433",
  region: "us-west-2",
};

const tags = {
  cost: "MBA",
  team: "Lucas",
};

const incomeReportAppLayersStack: IncomeReportAppLayersStack = new IncomeReportAppLayersStack(app, "incomeReportAppLayers", {
  tags: tags,
  env: env
});

const incomeReportAppStack: IncomeReportAppStack = new IncomeReportAppStack(app, "incomeReportApp", {
  tags: tags,
  env: env
});

const incomeReportApiStack: IncomeReportApiStack = new IncomeReportApiStack(app, "IncomeReportApi", {
  tags: tags,
  env: env,
  filePollerHandler: incomeReportAppStack.filePollerHandler,
  incomeReportHandler: incomeReportAppStack.incomeReportHandler,
  balanceHandler: incomeReportAppStack.balanceHandler,
  htmlToPdfHandler: incomeReportAppStack.htmlToPdfHandler,
  htmlHandler: incomeReportAppStack.htmlHandler
});

const incomeReportWSApiStack: IncomeReportWSApiStack = new IncomeReportWSApiStack(app, "IncomeReportWSApi", {
  tags: tags,
  env: env,
  verifyFileHandler: incomeReportAppStack.verifyFileHandler
});

incomeReportApiStack.addDependency(incomeReportAppStack);
incomeReportAppStack.addDependency(incomeReportWSApiStack);
incomeReportAppStack.addDependency(incomeReportAppLayersStack);