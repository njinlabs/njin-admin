import { type Field, type RawSchema, toFields } from "./model";

// A settings group: one record, edited in place, so it has fields but no list.
export type VarsSchema = {
  name: string;
  prefix: string;
  draftable: boolean;
  i18n: boolean;
  fields: Field[];
};

export const toVarsSchema = ({ schema, ...rest }: RawSchema): VarsSchema => ({
  ...rest,
  fields: toFields(schema),
});
