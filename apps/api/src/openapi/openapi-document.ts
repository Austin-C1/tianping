import type { INestApplication } from "@nestjs/common";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";

export function createOpenApiDocument(app: INestApplication) {
  const config = new DocumentBuilder()
    .setTitle("PMX API")
    .setDescription("Polymarket trading platform API")
    .setVersion("0.1.0")
    .addBearerAuth(
      {
        bearerFormat: "JWT",
        scheme: "bearer",
        type: "http"
      },
      "bearer"
    )
    .build();

  return SwaggerModule.createDocument(app, config);
}

export function setupOpenApi(app: INestApplication): void {
  SwaggerModule.setup("openapi", app, createOpenApiDocument(app));
}
