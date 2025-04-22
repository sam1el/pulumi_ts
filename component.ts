import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import * as docker from "@pulumi/docker";
import { containerPort, cpu, memory, motd } from "./config";

export interface AppInfraArgs {
    name: string;
}

export class AppInfra extends pulumi.ComponentResource {
    public readonly url: pulumi.Output<string>;

    constructor(name: string, args: AppInfraArgs, opts?: pulumi.ComponentResourceOptions) {
        super("custom:infra:AppInfra", name, {}, opts);

        // VPC
        const vpc = new aws.ec2.Vpc(`${name}-vpc`, {
            cidrBlock: "10.0.0.0/16",
            enableDnsSupport: true,
            enableDnsHostnames: true,
            tags: { Name: `${name}-vpc` },
        }, { parent: this });

        // Subnets and Route Table Associations
        const azs = ["us-west-2a", "us-west-2b"];
        const subnets = azs.map((az, i) =>
            new aws.ec2.Subnet(`${name}-subnet-${i + 1}`, {
                vpcId: vpc.id,
                cidrBlock: `10.0.${i + 1}.0/24`,
                availabilityZone: az,
                tags: { Name: `${name}-subnet-${i + 1}` },
            }, { parent: this })
        );

        const igw = new aws.ec2.InternetGateway(`${name}-igw`, {
            vpcId: vpc.id,
            tags: { Name: `${name}-igw` },
        }, { parent: this });

        const routeTable = new aws.ec2.RouteTable(`${name}-route-table`, {
            vpcId: vpc.id,
            routes: [{
                cidrBlock: "0.0.0.0/0",
                gatewayId: igw.id,
            }],
            tags: { Name: `${name}-route-table` },
        }, { parent: this });

        subnets.forEach((subnet, i) => {
            new aws.ec2.RouteTableAssociation(`${name}-rta-${i + 1}`, {
                subnetId: subnet.id,
                routeTableId: routeTable.id,
            }, { parent: this });
        });

        // Security Group
        const securityGroup = new aws.ec2.SecurityGroup(`${name}-sg`, {
            vpcId: vpc.id,
            description: "Allow HTTP/HTTPS",
            ingress: [
                { protocol: "tcp", fromPort: 80, toPort: 80, cidrBlocks: ["0.0.0.0/0"] },
                { protocol: "tcp", fromPort: 443, toPort: 443, cidrBlocks: ["0.0.0.0/0"] },
            ],
            egress: [
                { protocol: "-1", fromPort: 0, toPort: 0, cidrBlocks: ["0.0.0.0/0"] },
            ],
        }, { parent: this });

        // ECS Cluster
        const cluster = new aws.ecs.Cluster(`${name}-cluster`, {}, { parent: this });

        // ECR Repository & Docker Image
        const repo = new aws.ecr.Repository(`${name}-repo`, { forceDelete: true }, { parent: this });
        const image = new docker.Image(`${name}-image`, {
            build: { context: "./app", platform: "linux/amd64" },
            imageName: pulumi.interpolate`${repo.repositoryUrl}:latest`,
            registry: repo.registryId.apply(async (registryId) => {
                const credentials = await aws.ecr.getCredentials({ registryId });
                const decoded = Buffer.from(credentials.authorizationToken, 'base64').toString();
                const [username, password] = decoded.split(':');
                return { server: credentials.proxyEndpoint, username, password };
            }),
        }, { parent: this });

        // IAM Role for ECS Task Execution
        const taskExecutionRole = new aws.iam.Role(`${name}-task-execution-role`, {
            assumeRolePolicy: aws.iam.assumeRolePolicyForPrincipal({ Service: "ecs-tasks.amazonaws.com" }),
        }, { parent: this });

        new aws.iam.RolePolicyAttachment(`${name}-task-execution-role-policy`, {
            role: taskExecutionRole.name,
            policyArn: "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy",
        }, { parent: this });

        // ECS Task Definition
        const taskDefinition = new aws.ecs.TaskDefinition(`${name}-task`, {
            family: `${name}-task`,
            networkMode: "awsvpc",
            requiresCompatibilities: ["FARGATE"],
            cpu: cpu.toString(),
            memory: memory.toString(),
            executionRoleArn: taskExecutionRole.arn,
            containerDefinitions: pulumi.output([{
                name: "app",
                image: image.imageName,
                cpu: cpu,
                memory: memory,
                essential: true,
                portMappings: [{ containerPort, protocol: "tcp" }],
                environment: [{ name: "MOTD", value: motd }],
            }]).apply(defs => JSON.stringify(defs)),
        }, { parent: this });

        // ALB, Target Group, Listener
        const alb = new aws.lb.LoadBalancer(`${name}-alb`, {
            internal: false,
            loadBalancerType: "application",
            securityGroups: [securityGroup.id],
            subnets: subnets.map(s => s.id),
        }, { parent: this });

        const targetGroup = new aws.lb.TargetGroup(`${name}-tg`, {
            port: containerPort,
            protocol: "HTTP",
            targetType: "ip",
            vpcId: vpc.id,
            healthCheck: {
                path: "/",
                interval: 30,
                timeout: 5,
                unhealthyThreshold: 2,
                healthyThreshold: 2,
            },
        }, { parent: this });

        new aws.lb.Listener(`${name}-listener`, {
            loadBalancerArn: alb.arn,
            port: 80,
            defaultActions: [{ type: "forward", targetGroupArn: targetGroup.arn }],
        }, { parent: this });

        // ECS Service
        new aws.ecs.Service(`${name}-service`, {
            cluster: cluster.arn,
            taskDefinition: taskDefinition.arn,
            desiredCount: 1,
            launchType: "FARGATE",
            networkConfiguration: {
                assignPublicIp: true,
                subnets: subnets.map(s => s.id),
                securityGroups: [securityGroup.id],
            },
            loadBalancers: [{
                targetGroupArn: targetGroup.arn,
                containerName: "app",
                containerPort: containerPort,
            }],
        }, { parent: this });

        // Export the DNS name of the load balancer
        this.url = pulumi.interpolate`http://${alb.dnsName}`;
        this.registerOutputs({ url: this.url });
    }
}