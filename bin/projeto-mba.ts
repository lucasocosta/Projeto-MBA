#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import { IncomeReportAppLayersStack } from "../lib/incomeReportAppLayers-stack";
import { IncomeReportAppStack } from "../lib/incomeReportApp-stack";
import { IncomeReportApiStack } from "../lib/incomeReportApi-stack";

const app = new cdk.App();
const env: cdk.Environment = {
  account: "352268968433",
  region: "us-east-1",
};

const tags = {
  cost: "ECommerce",
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

incomeReportApiStack.addDependency(incomeReportAppStack);
incomeReportAppStack.addDependency(incomeReportAppLayersStack);