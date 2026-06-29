import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "../src/app.module";
import { createOpenApiDocument } from "../src/openapi/openapi-document";

async function main() {
  const app = await NestFactory.create(AppModule, { logger: false });
  const document = createOpenApiDocument(app);
  const target = resolve(__dirname, "../openapi.json");

  writeFileSync(target, `${JSON.stringify(document, null, 2)}\n`);
  await app.close();
}

void main();
