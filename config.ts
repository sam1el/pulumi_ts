import * as pulumi from "@pulumi/pulumi";

const config = new pulumi.Config();
export const containerPort = config.getNumber("containerPort") || 80;
export const cpu = config.getNumber("cpu") || 512;
export const memory = config.getNumber("memory") || 1024;
export const motd = config.require("motd");
export const name = config.require("name");