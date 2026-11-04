import { zodResolver } from "@hookform/resolvers/zod";
import { login, toApiError } from "@njinlabs/njin-admin/sdk";
import {
  Button,
  Field,
  FieldError,
  FieldLabel,
  Input,
} from "@njinlabs/njin-admin/ui";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation, useNavigate, useRouter } from "@tanstack/react-router";
import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import z from "zod";
import { AuthLayout } from "../components/auth-layout";
import { PasswordInput } from "../components/password-input";
import { client } from "../lib/client";
import { sessionKey, sessionQuery } from "../lib/session";

const schema = z.object({
  email: z.email("Enter a valid email"),
  password: z.string().min(1, "Required"),
});

// Only a page of this admin: the address comes from the query string, so anything else is ignored.
export const safeRedirect = (value: unknown) =>
  typeof value === "string" && /^\/(?![/\\])/.test(value) ? value : undefined;

export const LoginPage = () => {
  const navigate = useNavigate();
  const router = useRouter();
  const redirect = useLocation({
    select: (location) =>
      safeRedirect((location.search as { redirect?: unknown }).redirect),
  });
  const queryClient = useQueryClient();
  const session = useQuery(sessionQuery());
  // Sent here by a session that ended, not by someone arriving signed out.
  const expired = useLocation({
    select: (location) => !!(location.state as { expired?: boolean }).expired,
  });

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "" },
  });

  const signIn = useMutation({
    mutationFn: (input: z.infer<typeof schema>) => login(client, input),
    // The server has signed the browser in (a cookie this page cannot see); what is left is to
    // let `Protected` know.
    onSuccess: ({ user }) => queryClient.setQueryData(sessionKey, user),
  });

  useEffect(() => {
    if (!session.data) return;
    // The address is the router's own, without the base path the browser needs.
    if (redirect) router.history.push(`${router.basepath}${redirect}`);
    else navigate({ to: "/" });
  }, [session.data, navigate, router, redirect]);

  const error = signIn.error && toApiError(signIn.error);
  // The server says only "Unauthorized" for a wrong email or password.
  const message =
    error?.status === 401 ? "Wrong email or password." : error?.message;

  if (session.data) return null;

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

        {expired && !message && (
          <p
            role="status"
            className="rounded-control border bg-subtle px-3 py-2 text-sm text-muted-foreground"
          >
            Your session has ended. Sign in again to continue.
          </p>
        )}

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
