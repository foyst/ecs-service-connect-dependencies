# ECS Service Connect Dependency Example

This codebase demonstrates dependency race conditions that can be encountered with AWS ECS Service Connect, depending on how you provision and configuire your services.

https://ben-foster.dev/2024/03/managing-dependencies-between-apps-when-using-aws-ecs-service-connect/

To run:

```bash
npm install
cdk deploy --all
```

Then, find the EC2 service deployed within the AWS console and connect to its public IP address over http.

You should see the WordPress installation begin, with a selection of languages.

To reproduce the issue described in my blog:

1. Comment out the `wordpressService.node.addDependency(mySqlService);` line in `lib/services-stack.ts`,
2. Run a `cdk destroy ServicesStack`, followed by another `cdk deploy -all` command
3. Connect to the EC2 instance again and you should see the WordPress installation fail with a database connection error.
