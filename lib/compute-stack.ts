import { Stack, StackProps } from "aws-cdk-lib";
import { Construct } from "constructs";
import * as ecs from "aws-cdk-lib/aws-ecs";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as autoscaling from "aws-cdk-lib/aws-autoscaling";
import * as iam from "aws-cdk-lib/aws-iam";
import * as servicediscovery from "aws-cdk-lib/aws-servicediscovery";

export class ComputeStack extends Stack {
  public readonly cluster: ecs.Cluster;
  public readonly ec2SecurityGroup: ec2.SecurityGroup;
  public readonly vpc: ec2.Vpc;
  public readonly dnsNamespace: servicediscovery.PrivateDnsNamespace;

  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    this.vpc = new ec2.Vpc(this, "Vpc", {
      maxAzs: 1,
      natGateways: 0,
      subnetConfiguration: [
        {
          cidrMask: 24,
          name: "Public",
          subnetType: ec2.SubnetType.PUBLIC,
        },
      ],
    });

    this.dnsNamespace = new servicediscovery.PrivateDnsNamespace(
      this,
      "DnsNamespace",
      {
        name: "service-connect.test",
        vpc: this.vpc,
      }
    );

    this.cluster = new ecs.Cluster(this, "EcsCluster", {
      vpc: this.vpc,
      clusterName: "ECSServiceConnectTest",
    });

    const ec2Role = new iam.Role(this, "EC2Role", {
      assumedBy: new iam.ServicePrincipal("ec2.amazonaws.com"),
    });

    ec2Role.addManagedPolicy(
      iam.ManagedPolicy.fromAwsManagedPolicyName(
        "service-role/AmazonEC2ContainerServiceforEC2Role"
      )
    );

    ec2Role.addManagedPolicy(
      iam.ManagedPolicy.fromAwsManagedPolicyName("AmazonSSMManagedInstanceCore")
    );

    this.ec2SecurityGroup = new ec2.SecurityGroup(this, "SecurityGroup", {
      vpc: this.vpc,
      allowAllOutbound: true,
    });

    this.ec2SecurityGroup.connections.allowFromAnyIpv4(
      ec2.Port.tcp(80),
      "Open to the world"
    );

    const autoScalingGroup = new autoscaling.AutoScalingGroup(this, "ASG", {
      vpc: this.vpc,
      securityGroup: this.ec2SecurityGroup,
      instanceType: ec2.InstanceType.of(
        ec2.InstanceClass.BURSTABLE3,
        ec2.InstanceSize.SMALL
      ),
      machineImage: ecs.EcsOptimizedImage.amazonLinux2023(),
      desiredCapacity: 1,
      role: ec2Role,
      vpcSubnets: { subnetType: ec2.SubnetType.PUBLIC },
      associatePublicIpAddress: true,
    });

    this.cluster.addAsgCapacityProvider(
      new ecs.AsgCapacityProvider(this, "AsgCapacityProvider", {
        autoScalingGroup,
        enableManagedTerminationProtection: false,
      })
    );
  }
}
