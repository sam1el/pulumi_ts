import { AppInfra } from "./component";
import { name } from "./config";

const infra = new AppInfra(name, { name });

export const url = infra.url;