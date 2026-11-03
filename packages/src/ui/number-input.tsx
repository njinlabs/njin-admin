import { NumericFormat } from "react-number-format";
import { Input } from "./input";

type NumberInputProps = {
  value: number | null | undefined;
  // `undefined` when the box is empty, so a cleared field is "no value", not 0.
  onValueChange: (value: number | undefined) => void;
  placeholder?: string;
  disabled?: boolean;
  invalid?: boolean;
  className?: string;
};

export const NumberInput = ({
  value,
  onValueChange,
  invalid,
  ...props
}: NumberInputProps) => (
  <NumericFormat
    customInput={Input}
    inputMode="decimal"
    allowNegative
    value={value ?? ""}
    onValueChange={({ floatValue }) => onValueChange(floatValue)}
    data-invalid={invalid ? "" : undefined}
    {...props}
  />
);
