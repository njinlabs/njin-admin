import { zodResolver } from "@hookform/resolvers/zod";
import { createFirstAdmin, toApiError } from "@njinlabs/njin-admin/sdk";
import {
  Button,
  Field,
  FieldError,
  FieldLabel,
  Input,
} from "@njinlabs/njin-admin/ui";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useCookies } from "react-cookie";
import { Controller, useForm } from "react-hook-form";
import z from "zod";
import { AuthLayout } from "../components/auth-layout";
import { PasswordInput } from "../components/password-input";
import { client } from "../lib/client";

const schema = z.object({
  name: z.string().trim().min(1, "Required"),
  email: z.email("Enter a valid email"),
  password: z.string().min(8, "At least 8 characters"),
});

type Values = z.infer<typeof schema>;

export const SetupPage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [, setCookie] = useCookies(["token"]);

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", email: "", password: "" },
  });

  const setup = useMutation({
    mutationFn: (input: Values) => createFirstAdmin(client, input),
    onSuccess: async ({ token }) => {
      // Before leaving, or the root would send us straight back here.
      queryClient.setQueryData(["setup-status"], { needsSetup: false });
      setCookie("token", token, { path: "/", maxAge: 60 * 60 * 24 * 30 });
      await navigate({ to: "/" });
    },
    onError: (error) => {
      const { status, fields } = toApiError(error);

      // Someone else finished the setup first.
      if (status === 403) {
        queryClient.setQueryData(["setup-status"], { needsSetup: false });
        navigate({ to: "/login" });
        return;
      }

      for (const [name, message] of Object.entries(fields)) {
        if (name in schema.shape) {
          form.setError(name as keyof Values, { message });
        }
      }
    },
  });

  const error = setup.error && toApiError(setup.error);

  return (
    <AuthLayout
      title="Create the first admin"
      description="This account can do everything. It can only be created once."
    >
      <form
        noValidate
        onSubmit={form.handleSubmit((values) => setup.mutate(values))}
        className="space-y-5"
      >
        <Controller
          control={form.control}
          name="name"
          render={({ field, fieldState }) => (
            <Field invalid={fieldState.invalid}>
              <FieldLabel>Name</FieldLabel>
              <Input {...field} autoComplete="name" />
              <FieldError errors={[fieldState.error]} />
            </Field>
          )}
        />

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
              <PasswordInput {...field} autoComplete="new-password" />
              <FieldError errors={[fieldState.error]} />
            </Field>
          )}
        />

        {error && Object.keys(error.fields).length === 0 && (
          <FieldError>{error.message}</FieldError>
        )}

        <Button
          type="submit"
          disabled={setup.isPending || setup.isSuccess}
          className="w-full"
        >
          {setup.isPending ? "Creating…" : "Create admin"}
        </Button>
      </form>
    </AuthLayout>
  );
};
