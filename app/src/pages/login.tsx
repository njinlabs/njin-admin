import { zodResolver } from "@hookform/resolvers/zod";
import { login, toApiError } from "@njinlabs/njin-admin/sdk";
import {
  Button,
  Field,
  FieldError,
  FieldLabel,
  Input,
} from "@njinlabs/njin-admin/ui";
import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useCookies } from "react-cookie";
import { Controller, useForm } from "react-hook-form";
import z from "zod";
import { AuthLayout } from "../components/auth-layout";
import { PasswordInput } from "../components/password-input";
import { client } from "../lib/client";

const schema = z.object({
  email: z.email("Enter a valid email"),
  password: z.string().min(1, "Required"),
});

export const LoginPage = () => {
  const navigate = useNavigate();
  const [cookies, setCookie] = useCookies(["token"]);

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "" },
  });

  const signIn = useMutation({
    mutationFn: (input: z.infer<typeof schema>) => login(client, input),
    onSuccess: ({ token }) => {
      setCookie("token", token, { path: "/", maxAge: 60 * 60 * 24 * 30 });
    },
  });

  useEffect(() => {
    if (cookies.token) navigate({ to: "/" });
  }, [cookies.token, navigate]);

  const error = signIn.error && toApiError(signIn.error);
  // The server says only "Unauthorized" for a wrong email or password.
  const message =
    error?.status === 401 ? "Wrong email or password." : error?.message;

  if (cookies.token) return null;

  return (
    <AuthLayout
      title="Welcome back"
      description="Sign in to continue to the admin."
    >
      <form
        noValidate
        onSubmit={form.handleSubmit((values) => signIn.mutate(values))}
        className="space-y-5"
      >
        <Controller
          control={form.control}
          name="email"
          render={({ field, fieldState }) => (
            <Field invalid={fieldState.invalid}>
              <FieldLabel>Email</FieldLabel>
              <Input
                {...field}
                type="email"
                autoComplete="username"
                placeholder="you@example.com"
              />
              <FieldError errors={[fieldState.error]} />
            </Field>
          )}
        />

        <Controller
          control={form.control}
          name="password"
          render={({ field, fieldState }) => (
            <Field invalid={fieldState.invalid}>
              <FieldLabel>Password</FieldLabel>
              <PasswordInput
                {...field}
                autoComplete="current-password"
                placeholder="••••••••"
              />
              <FieldError errors={[fieldState.error]} />
            </Field>
          )}
        />

        {message && <FieldError>{message}</FieldError>}

        <Button
          type="submit"
          disabled={signIn.isPending || signIn.isSuccess}
          className="w-full"
        >
          {signIn.isPending ? "Signing in…" : "Sign in"}
        </Button>
      </form>
    </AuthLayout>
  );
};
