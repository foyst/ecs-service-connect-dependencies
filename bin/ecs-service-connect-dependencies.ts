#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { EcsServiceConnectDependenciesStack } from '../lib/ecs-service-connect-dependencies-stack';

const app = new cdk.App();
new EcsServiceConnectDependenciesStack(app, 'EcsServiceConnectDependenciesStack');
