#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";
import { ComputeStack } from "../lib/compute-stack";
import { ServicesStack } from "../lib/services-stack";

const app = new cdk.App();

const computeStack = new ComputeStack(app, "ComputeStack");

new ServicesStack(app, "ServicesStack", {
  dnsNamespace: computeStack.dnsNamespace,
  vpc: computeStack.vpc,
  cluster: computeStack.cluster,
});
