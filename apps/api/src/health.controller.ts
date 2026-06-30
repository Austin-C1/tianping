import { Controller, Get } from "@nestjs/common";
import { ApiOkResponse, ApiTags } from "@nestjs/swagger";
import { HealthResponseDto } from "./openapi/api-contract.dto";

@Controller("health")
@ApiTags("health")
export class HealthController {
  @Get()
  @ApiOkResponse({ type: HealthResponseDto })
  check() {
    return {
      ok: true,
      service: "pmx-api",
      stage: "engineering-skeleton"
    };
  }
}
