"use client";

import { FormEvent, useState } from "react";
import { login, register, saveAccessToken } from "./auth-client";

type AuthMode = "login" | "register";

interface AuthFormProps {
  mode: AuthMode;
}

export function AuthForm({ mode }: AuthFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isRegister = mode === "register";
  const title = isRegister ? "注册账户" : "登录账户";
  const buttonText = isRegister ? "注册" : "登录";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage("");

    try {
      const result = isRegister
        ? await register({ email, password })
        : await login({ email, password });
      saveAccessToken(result.accessToken);
      setMessage(isRegister ? `已注册并登录：${result.user.email}` : `已登录：${result.user.email}`);
    } catch {
      setMessage(isRegister ? "注册失败" : "登录失败");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="auth-form" onSubmit={handleSubmit}>
      <h2>{title}</h2>
      <label>
        Email
        <input
          autoComplete="email"
          name="email"
          onChange={(event) => setEmail(event.target.value)}
          required
          type="email"
          value={email}
        />
      </label>
      <label>
        Password
        <input
          autoComplete={isRegister ? "new-password" : "current-password"}
          minLength={8}
          name="password"
          onChange={(event) => setPassword(event.target.value)}
          required
          type="password"
          value={password}
        />
      </label>
      <button disabled={isSubmitting} type="submit">
        {isSubmitting ? "处理中" : buttonText}
      </button>
      {message ? <p role="status">{message}</p> : null}
    </form>
  );
}
