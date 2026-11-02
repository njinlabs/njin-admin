import { describe, expect, test } from "bun:test";
import { renderToString } from "react-dom/server";
import { Calendar, DatePicker, formatDate } from "../../../src/ui";

describe("formatDate", () => {
  test("is day/month/year with zero padding", () => {
    expect(formatDate(new Date(2026, 0, 5))).toBe("05/01/2026");
  });
});

describe("DatePicker", () => {
  const noop = () => {};

  test("shows the date of an ISO value", () => {
    const iso = new Date(2026, 10, 2, 12).toISOString();

    expect(
      renderToString(<DatePicker value={iso} onChange={noop} />),
    ).toContain("02/11/2026");
  });

  test("shows the placeholder without a value", () => {
    const html = renderToString(
      <DatePicker value={undefined} onChange={noop} placeholder="Pick one" />,
    );

    expect(html).toContain("Pick one");
  });

  test("reads a value that is not a date as empty", () => {
    const html = renderToString(<DatePicker value="nope" onChange={noop} />);

    expect(html).not.toContain("NaN");
    expect(html).toContain("Pick a date");
  });
});

describe("Calendar", () => {
  test("renders the month of the selected day with that day marked", () => {
    const html = renderToString(
      <Calendar
        mode="single"
        selected={new Date(2026, 10, 2)}
        defaultMonth={new Date(2026, 10, 2)}
      />,
    );

    expect(html).toContain("November 2026");
    expect(html).toContain("bg-primary");
  });
});
