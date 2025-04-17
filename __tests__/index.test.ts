import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import * as awsx from "@pulumi/awsx";
import { assert } from "chai";

// Mock Pulumi Config
class MockConfig {
    getNumber(key: string): number | undefined {
        const mockValues: Record<string, number> = {
            containerPort: 8080,
            cpu: 256,
            memory: 512,
        };
        return mockValues[key];
    }

    require(key: string): string {
        if (key === "motd") {
            return "Hello, Pulumi!";
        }
        throw new Error(`Missing required config key: ${key}`);
    }
}

// Set Pulumi Mocks
pulumi.runtime.setMocks({
    newResource: (args) => {
        return {
            id: `${args.name}-id`,
            state: args.inputs,
        };
    },
    call: (args) => {
        return args.inputs;
    },
});

describe("Infrastructure Tests", () => {
    let cluster: aws.ecs.Cluster;
    let loadbalancer: awsx.lb.ApplicationLoadBalancer;
    let repo: awsx.ecr.Repository;
    let image: awsx.ecr.Image;
    let service: awsx.ecs.FargateService;
    let url: pulumi.Output<string>;

    before(async () => {
        // Inject MockConfig into the test environment
        const config = new MockConfig();

        // Load the stack outputs
        const stack = await pulumi.runtime.runInPulumiStack(async () => {
            const containerPort = config.getNumber("containerPort") || 80;
            const cpu = config.getNumber("cpu") || 512;
            const memory = config.getNumber("memory") || 128;
            const motd = config.require("motd");

            // An ECS cluster to deploy into
            cluster = new aws.ecs.Cluster("sam1el-dev-cluster", {});

            // An ALB to serve the container endpoint to the internet
            loadbalancer = new awsx.lb.ApplicationLoadBalancer("sam1el-lb", {});

            // An ECR repository to store our application's container image
            repo = new awsx.ecr.Repository("sam1el-repo", {
                forceDelete: true,
            });

            // Build and publish our application's container image from ./app to the ECR repository
            image = new awsx.ecr.Image("image", {
                repositoryUrl: repo.url,
                context: "./app",
                platform: "linux/amd64",
                imageName: "sam1ell-dev",
            });

            // Deploy an ECS Service on Fargate to host the application container
            service = new awsx.ecs.FargateService("service", {
                cluster: cluster.arn,
                assignPublicIp: true,
                taskDefinitionArgs: {
                    container: {
                        name: "app",
                        image: image.imageUri,
                        cpu: cpu,
                        memory: memory,
                        essential: true,
                        portMappings: [{
                            containerPort: containerPort,
                            targetGroup: loadbalancer.defaultTargetGroup,
                        }],
                        environment: [
                            { name: "MOTD", value: motd },
                        ],
                    },
                },
            });

            // The URL at which the container's HTTP endpoint will be available
            url = pulumi.interpolate`http://${loadbalancer.loadBalancer.dnsName}`;
            return { url };
        });

        if (!stack) {
            throw new Error("Failed to load stack outputs.");
        }
        url = stack.url;
    });

    it("should create an ECS cluster", () => {
        assert.isDefined(cluster);
    });

    it("should create an Application Load Balancer", () => {
        assert.isDefined(loadbalancer);
    });

    it("should create an ECR repository", () => {
        assert.isDefined(repo);
    });

    it("should build and publish an image to ECR", () => {
        assert.isDefined(image);
    });

    it("should deploy an ECS Fargate Service", () => {
        assert.isDefined(service);
    });

    it("should output a valid URL", async () => {
        const outputUrl = await url;
        assert.match(outputUrl, /^http:\/\/.+/);
    });
});