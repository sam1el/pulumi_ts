# Pulumi TypeScript AWS Deployment

This project demonstrates how to deploy a containerized web application to AWS using Pulumi, TypeScript, and Docker. The infrastructure is defined in [`index.ts`](index.ts), which provisions an ECS cluster, an Application Load Balancer (ALB), an Elastic Container Registry (ECR), and a Fargate service.

## Overview

The `index.ts` file automates the following tasks:

1. Creates an ECS cluster to host the application.
2. Sets up an Application Load Balancer to route traffic to the application.
3. Creates an ECR repository to store the Docker container image.
4. Builds and pushes the container image from the `app/` directory to the ECR repository.
5. Deploys the containerized application to AWS Fargate with environment variables and resource configurations.

## Prerequisites

Ensure the following tools and configurations are in place:

- [Node.js](https://nodejs.org/en/download/) (>= 14.0.0)
- [Pulumi CLI](https://www.pulumi.com/docs/get-started/install/) (>= 3.0.0)
- [AWS CLI](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html) (>= 2.0.0)
- AWS credentials configured in your environment
- Docker installed and running

## Configuration

The application uses Pulumi configuration to define deployment parameters. These are set in `Pulumi.dev.yaml`:

- `pulumi_ts:containerPort`: The port the container listens on (default: `80`).
- `pulumi_ts:cpu`: The CPU units allocated to the container (default: `512`).
- `pulumi_ts:memory`: The memory allocated to the container in MB (default: `128`).
- `pulumi_ts:motd`: The "Message of the Day" displayed by the application.

## Deployment Steps

1. **Install Dependencies**  
   Run the following command to install the required dependencies:

   ```bash
   npm install
   ```

2. **Build and Deploy**  
   Use Pulumi to deploy the infrastructure:

   ```bash
   pulumi up
   ```

3. **Access the Application**  
   After deployment, Pulumi will output the URL of the application. Open the URL in your browser to access the web app.

## Application Details

The application is a simple Node.js web server built with Express. It responds with a "Hello World" message and the `MOTD` (Message of the Day) environment variable. The source code for the application is located in the `app/` directory.

### File Structure

- [`index.ts`](index.ts): Defines the Pulumi infrastructure.
- [`app/`](app/): Contains the Dockerized Node.js application.
  - `server.js`: The Express server implementation.
  - `Dockerfile`: The Docker configuration for building the container image.

## Cleanup

To remove all resources created by Pulumi, run:

```bash
pulumi destroy
```

This will delete the ECS cluster, ALB, ECR repository, and any other resources provisioned during deployment.

## Extra-credit

In the .github/workflows directory, you can find a GitHub Actions workflow that automatically builds and deploys the application to AWS whenever changes are pushed to the main branch. This CI/CD pipeline uses Pulumi to manage the infrastructure as code.
