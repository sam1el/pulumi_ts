import * as aws from "@pulumi/aws";
import * as docker from "@pulumi/docker";
import * as pulumi from "@pulumi/pulumi";

// Configuration values
const config = new pulumi.Config();
const containerPort = config.getNumber("containerPort") || 80;
const cpu = config.getNumber("cpu") || 512;
const memory = config.getNumber("memory") || 128;
const motd = config.require("motd");

// Create a VPC
const vpc = new aws.ec2.Vpc("my-vpc", {
    cidrBlock: "10.0.0.0/16",
    enableDnsSupport: true,
    enableDnsHostnames: true,
    tags: {
        Name: "my-vpc",
    },
});

// Create subnets
const subnet1 = new aws.ec2.Subnet("my-subnet-1", {
    vpcId: vpc.id,
    cidrBlock: "10.0.1.0/24",
    availabilityZone: "us-west-2a",
    tags: {
        Name: "my-subnet-1",
    },
});

const subnet2 = new aws.ec2.Subnet("my-subnet-2", {
    vpcId: vpc.id,
    cidrBlock: "10.0.2.0/24",
    availabilityZone: "us-west-2b",
    tags: {
        Name: "my-subnet-2",
    },
});

// Create an internet gateway
const internetGateway = new aws.ec2.InternetGateway("my-igw", {
    vpcId: vpc.id,
    tags: {
        Name: "my-igw",
    },
});

// Create a route table
const routeTable = new aws.ec2.RouteTable("my-route-table", {
    vpcId: vpc.id,
    routes: [{
        cidrBlock: "0.0.0.0/0",
        gatewayId: internetGateway.id,
    }],
    tags: {
        Name: "my-route-table",
    },
});

// Associate the route table with the subnets
new aws.ec2.RouteTableAssociation("my-route-table-association-1", {
    subnetId: subnet1.id,
    routeTableId: routeTable.id,
});

new aws.ec2.RouteTableAssociation("my-route-table-association-2", {
    subnetId: subnet2.id,
    routeTableId: routeTable.id,
});

// Create a security group
const securityGroup = new aws.ec2.SecurityGroup("web-secgrp", {
    vpcId: vpc.id,
    description: "Allow HTTP traffic",
    ingress: [
        { protocol: "tcp", fromPort: 80, toPort: 80, cidrBlocks: ["0.0.0.0/0"] },
        { protocol: "tcp", fromPort: 443, toPort: 443, cidrBlocks: ["0.0.0.0/0"] },
    ],
    egress: [
        { protocol: "-1", fromPort: 0, toPort: 0, cidrBlocks: ["0.0.0.0/0"] },
    ],
});

// ECS Cluster
const cluster = new aws.ecs.Cluster("sam1el-dev-cluster");

// ECR Repository
const repo = new aws.ecr.Repository("sam1el-repo", {
    forceDelete: true,
});

// Docker Image
const image = new docker.Image("image", {
    build: {
        context: "./app",
        platform: "linux/amd64" // Explicitly setting the platform
    },
    imageName: pulumi.interpolate`${repo.repositoryUrl}:latest`,
    registry: repo.registryId.apply(async (registryId) => {
        const credentials = await aws.ecr.getCredentials({ registryId });
        const decodedCredentials = Buffer.from(credentials.authorizationToken, 'base64').toString();
        const [username, password] = decodedCredentials.split(':');
        return { server: credentials.proxyEndpoint, username, password };
    }),
});

// IAM Role for ECS Task Execution
const taskExecutionRole = new aws.iam.Role("task-execution-role", {
    assumeRolePolicy: aws.iam.assumeRolePolicyForPrincipal({ Service: "ecs-tasks.amazonaws.com" }),
});

new aws.iam.RolePolicyAttachment("task-execution-role-policy", {
    role: taskExecutionRole.name,
    policyArn: "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy",
});

// ECS Task Definition
const taskDefinition = new aws.ecs.TaskDefinition("app-task", {
    family: "my-app-task",
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
        portMappings: [{
            containerPort: containerPort,
            protocol: "tcp",
        }],
        environment: [{ name: "MOTD", value: motd }],
    }]).apply(definitions => JSON.stringify(definitions)),
});

// ALB
const alb = new aws.lb.LoadBalancer("sam1el-lb", {
    internal: false,
    loadBalancerType: "application",
    securityGroups: [securityGroup.id],
    subnets: [subnet1.id, subnet2.id],
});

const targetGroup = new aws.lb.TargetGroup("app-tg", {
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
});

const listener = new aws.lb.Listener("app-listener", {
    loadBalancerArn: alb.arn,
    port: 80,
    defaultActions: [{
        type: "forward",
        targetGroupArn: targetGroup.arn,
    }],
});

// ECS Service
const service = new aws.ecs.Service("app-service", {
    cluster: cluster.arn,
    taskDefinition: taskDefinition.arn,
    desiredCount: 1,
    launchType: "FARGATE",
    networkConfiguration: {
        assignPublicIp: true,
        subnets: [subnet1.id, subnet2.id],
        securityGroups: [securityGroup.id],
    },
    loadBalancers: [{
        targetGroupArn: targetGroup.arn,
        containerName: "app",
        containerPort: containerPort,
    }],
});

// Export the DNS name of the load balancer
export const url = pulumi.interpolate`http://${alb.dnsName}`;
