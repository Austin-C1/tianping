"use client";

import { FormEvent, useState } from "react";
import { useLanguage } from "../i18n/language-provider";
import { login, register, saveAccessToken } from "./auth-client";

type AuthMode = "login" | "register";

interface AuthFormProps {
  mode: AuthMode;
}

export function AuthForm({ mode }: AuthFormProps) {
  const { messages } = useLanguage();
  const copy = messages.auth;
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isRegister = mode === "register";
  const title = isRegister ? copy.createAccount : copy.loginTitle;
  const buttonText = isRegister ? copy.registerButton : copy.loginButton;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage("");

    try {
      const result = isRegister
        ? await register({ email, password })
        : await login({ email, password });
      saveAccessToken(result.accessToken);
      setMessage(
        `${isRegister ? copy.registerSuccess : copy.loginSuccess}${result.user.email}`
      );
    } catch {
      setMessage(isRegister ? copy.registerFailed : copy.loginFailed);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="auth-form" onSubmit={handleSubmit}>
      <h2>{title}</h2>
      <label>
        {copy.email}
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
        {copy.password}
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
        {isSubmitting ? copy.processing : buttonText}
      </button>
      {message ? <p role="status">{message}</p> : null}
    </form>
  );
}
