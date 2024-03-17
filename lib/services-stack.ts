import { Stack, StackProps } from "aws-cdk-lib";
import { Construct } from "constructs";
import * as ecs from "aws-cdk-lib/aws-ecs";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as cdk from "aws-cdk-lib";
import * as servicediscovery from "aws-cdk-lib/aws-servicediscovery";

export interface ServicesStackProps extends StackProps {
  dnsNamespace: servicediscovery.PrivateDnsNamespace;
  vpc: ec2.Vpc;
  cluster: ecs.Cluster;
}

export class ServicesStack extends Stack {
  constructor(scope: Construct, id: string, props: ServicesStackProps) {
    super(scope, id, props);

    const wordpressService = configureWordpress(this);
    const mySqlService = configureMySql(this);

    // Try to deploy with this commented out, and see a sad Wordpress install
    wordpressService.node.addDependency(mySqlService);

    function configureMySql(scope: cdk.Stack) {
      const taskDefinition = new ecs.Ec2TaskDefinition(
        scope,
        "MySqlTaskDefinition"
      );

      taskDefinition.addContainer("MySqlContainer", {
        image: ecs.ContainerImage.fromRegistry("mysql"),
        containerName: "mysql",
        memoryLimitMiB: 1024,
        cpu: 512,
        logging: new ecs.AwsLogDriver({
          streamPrefix: "MySql",
          mode: ecs.AwsLogDriverMode.NON_BLOCKING,
        }),
        environment: {
          MYSQL_USER: "wordpress",
          MYSQL_PASSWORD: "wordpress",
          MYSQL_ROOT_PASSWORD: "password",
          MYSQL_DATABASE: "wordpress",
        },
        portMappings: [
          {
            containerPort: 3306,
            name: "mysql",
          },
        ],
      });

      return new ecs.Ec2Service(scope, "MySqlService", {
        serviceName: "mysql",
        cluster: props.cluster,
        taskDefinition,
        desiredCount: 1,
        serviceConnectConfiguration: {
          services: [
            {
              portMappingName: "mysql",
              dnsName: "mysql",
              port: 3306,
            },
          ],
          namespace: props.dnsNamespace.namespaceName,
        },
        enableExecuteCommand: true,
      });
    }

    function configureWordpress(scope: cdk.Stack) {
      const taskDefinition = new ecs.Ec2TaskDefinition(
        scope,
        "WordpressTaskDefinition"
      );

      taskDefinition.addContainer("WordpressContainer", {
        image: ecs.ContainerImage.fromRegistry("wordpress"),
        containerName: "wordpress",
        memoryLimitMiB: 512,
        cpu: 512,
        logging: new ecs.AwsLogDriver({
          streamPrefix: "Wordpress",
          mode: ecs.AwsLogDriverMode.NON_BLOCKING,
        }),
        environment: {
          WORDPRESS_DB_HOST: "mysql",
          WORDPRESS_DB_USER: "wordpress",
          WORDPRESS_DB_PASSWORD: "wordpress",
          WORDPRESS_DB_NAME: "wordpress",
          WORDPRESS_DEBUG: "1",
        },
        portMappings: [
          {
            containerPort: 80,
            hostPort: 80,
            name: "wordpress",
          },
        ],
      });

      const wordpressService = new ecs.Ec2Service(scope, "WordpressService", {
        serviceName: "wordpress",
        cluster: props.cluster,
        taskDefinition,
        desiredCount: 1,
        serviceConnectConfiguration: {
          namespace: props.dnsNamespace.namespaceName,
        },
      });

      return wordpressService;
    }
  }
}
