import * as aws from "@pulumi/aws";
import * as awsx from "@pulumi/awsx";
import * as pulumi from "@pulumi/pulumi";

const config = new pulumi.Config();
const containerPort = config.getNumber("containerPort") || 80;
const cpu = config.getNumber("cpu") || 512;
const memory = config.getNumber("memory") || 128;
const motd = config.require("motd");

// An ECS cluster to deploy into
const cluster = new aws.ecs.Cluster("sam1el-dev-cluster", {});

// An ALB to serve the container endpoint to the internet
const loadbalancer = new awsx.lb.ApplicationLoadBalancer("sam1el-lb", {});

// An ECR repository to store our application's container image
const repo = new awsx.ecr.Repository("sam1el-repo", {
	forceDelete: true,
});

// Build and publish our application's container image from ./app to the ECR repository
const image = new awsx.ecr.Image("image", {
	repositoryUrl: repo.url,
	context: "./app",
	platform: "linux/amd64",
	imageName: "sam1ell-dev",
});

// Deploy an ECS Service on Fargate to host the application container
const service = new awsx.ecs.FargateService("service", {
	cluster: cluster.arn,
	assignPublicIp: true,
	taskDefinitionArgs: {
		container: {
			name: "app",
			image: image.imageUri,
			cpu: cpu,
			memory: memory,
			essential: true,
			portMappings: [
				{
					containerPort: containerPort,
					targetGroup: loadbalancer.defaultTargetGroup,
				},
			],
			environment: [{ name: "MOTD", value: motd }],
		},
	},
});

// The URL at which the container's HTTP endpoint will be available
export const url = pulumi.interpolate`http://${loadbalancer.loadBalancer.dnsName}`;
