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

To modify the MOTD messaege, update the `MOTD` environment variable in the `Pulumi.dev.yaml` configuration file.

```bash
pulumi config set motd "Your new message here"
```

After updating the configuration, run `pulumi up` again to redeploy the application with the new message.
The application will automatically reflect the changes upon redeployment.

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

## Extra Extra-credit (dev stack)

- The application is also configured for self-service from this repository. You can deploy the application to your own AWS account by forking this repository and following the deployment steps above. The GitHub Actions workflow will automatically build and deploy the application to your AWS account whenever changes are pushed to the main branch of your forked repository. You will need to set up your AWS credentials in the GitHub repository secrets for the workflow to work.

- The secrets should be named `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY`. You can find instructions on how to set up GitHub secrets [here](https://docs.github.com/en/actions/security-guides/encrypted-secrets).You will also need to set up the `AWS_REGION` secret to specify the AWS region where you want to deploy the application. The default region is `us-west-2`, but you can change it to any other region supported by AWS. You can find a list of supported regions [here](https://docs.aws.amazon.com/general/latest/gr/rande.html). Once you have set up the secrets, you can push changes to your forked repository and the workflow will automatically build and deploy the application to your AWS account. Your pulumi credentials will be used to authenticate with AWS and deploy the application. You can find more information about how to set up Pulumi credentials [here](https://www.pulumi.com/docs/intro/concepts/credentials/). you will need to configure your pulumi credentials in the actions workflow. You can do this by adding the `PULUMI_ACCESS_TOKEN` secret to your GitHub repository secrets. You can find instructions on how to set up GitHub secrets [here](https://docs.github.com/en/actions/security-guides/encrypted-secrets). The `PULUMI_ACCESS_TOKEN` secret should contain your Pulumi access token, which you can generate from the Pulumi console. You can find more information about how to generate a Pulumi access token [here](https://www.pulumi.com/docs/intro/concepts/credentials/#access-tokens).

- The workflow will automatically build the Docker image from the `app/` directory and push it to the ECR repository created by Pulumi. The workflow will also deploy the application to AWS Fargate with the specified configuration. You can find more information about how to use GitHub Actions with Pulumi [here](https://www.pulumi.com/docs/guides/continuous-delivery/github-actions/).

- To use the issue-ops you can create an issue in the repository and the workflow will automatically deploy the application to AWS Fargate with the specified configuration. You can find more information about how to use GitHub Actions with Pulumi [here](https://www.pulumi.com/docs/guides/continuous-delivery/github-actions/). you will have to use the correct issue tag to trigger the workflow. The issue tag should be `deploy` and the issue title should be `deploy <your-branch-name>`. The workflow will automatically build the Docker image from the `app/` directory and push it to the ECR repository created by Pulumi. The workflow will also deploy the application to AWS Fargate with the specified configuration. You can find more information about how to use GitHub Actions with Pulumi [here](https://www.pulumi.com/docs/guides/continuous-delivery/github-actions/).
- You can also use the `destroy` tag to destroy the application. The issue tag should be `destroy` and the issue title should be `destroy <your-branch-name>`. The workflow will automatically destroy the application and delete all resources created by Pulumi. You can find more information about how to use GitHub Actions with Pulumi [here](https://www.pulumi.com/docs/guides/continuous-delivery/github-actions/).
- Another option is to use the `update-motd` tag which is tied to the update-motd issue-template. The template expects you to type the new message in the body of the issue. The workflow will automatically update the MOTD environment variable in the `Pulumi.dev.yaml` configuration file and redeploy the application with the new message. You can find more information about how to use GitHub Actions with Pulumi [here](https://www.pulumi.com/docs/guides/continuous-delivery/github-actions/).