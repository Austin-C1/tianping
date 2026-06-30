import { registerAndLogin, type RegisterAndLoginResult } from "../auth.flow";
import type { AuthCredentials } from "../../features/auth/auth-client";

export async function runRegisterLoginScenario(
  credentials: AuthCredentials
): Promise<RegisterAndLoginResult> {
  return registerAndLogin(credentials);
}
