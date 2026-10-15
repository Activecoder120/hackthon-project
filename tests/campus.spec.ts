import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { writeFile } from "node:fs/promises";
test("free map, hostel filter, info card and accessible quick guides", async ({
  page,
}, testInfo) => {
  // Never scrape community tile servers in automated tests. A tiny image
  // fixture lets us exercise the real map library and tile event handling.
  let tileRequests = 0;
  await page.route("https://tile.openstreetmap.org/**", (route) => {
    tileRequests++;
    return route.fulfill({
      contentType: "image/png",
      body: Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=",
        "base64",
      ),
    });
  });
  await page.goto("./");
  expect(tileRequests).toBe(0);
  await page.locator("#open-map-center").click();
  await expect(page.locator("#map .leaflet-tile-loaded").first()).toBeVisible();
  expect(tileRequests).toBeGreaterThan(0);
  await expect(
    page.getByRole("link", { name: "OpenStreetMap contributors" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Expand map", exact: true }).click();
  await expect(page.locator(".map-expanded")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.locator(".map-expanded")).toHaveCount(0);
  await page.getByRole("button", { name: "Hostel", exact: true }).click();
  await expect(page.locator("#results .place")).toHaveCount(3);
  await expect(page.locator(".campus-pin")).toHaveCount(1);
  await page
    .getByRole("button", { name: "Old Boys Hostel · Hostel", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: /Old Boys Hostel Google/ }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByRole("link", { name: "Directions" })).toHaveAttribute(
    "href",
    /destination=18.604779%2C73.8753711/,
  );
  const axe = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
    .analyze();
  await writeFile(
    testInfo.outputPath("axe-dialog.json"),
    JSON.stringify(axe, null, 2),
  );
  expect(axe.violations).toEqual([]);
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: /I’m a fresher/ }).click();
  await page
    .getByRole("checkbox", { name: "Done: Admissions office", exact: true })
    .check();
  await page.reload();
  await page.getByRole("button", { name: /I’m a fresher/ }).click();
  await expect(
    page.getByRole("checkbox", {
      name: "Done: Admissions office",
      exact: true,
    }),
  ).toBeChecked();
  await page.keyboard.press("Escape");
  const home = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
    .analyze();
  await writeFile(
    testInfo.outputPath("axe-home.json"),
    JSON.stringify(home, null, 2),
  );
  expect(home.violations).toEqual([]);
  await page
    .getByRole("button", { name: /Switch language to Marathi/ })
    .click();
  await expect(
    page.getByRole("heading", { name: "कॅम्पस शोधा", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: /English/ }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator("body")).toHaveJSProperty("scrollWidth", 390);
  await page.screenshot({
    path: testInfo.outputPath("mobile.png"),
    fullPage: true,
  });
});
test("offline shell and mobile dark mode remain usable", async ({
  page,
  context,
}, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ colorScheme: "dark", reducedMotion: "reduce" });
  await page.goto("./");
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload();
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null);
  const audit = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
    .analyze();
  await writeFile(
    testInfo.outputPath("axe-mobile-dark.json"),
    JSON.stringify(audit, null, 2),
  );
  expect(audit.violations).toEqual([]);
  await context.setOffline(true);
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Explore campus", exact: true }),
  ).toBeVisible();
  await expect(page.locator("#map-status")).toHaveText(
    "Map offline. Showing list only.",
  );
  await page.getByRole("searchbox").fill("old boys");
  await expect(page.locator("#results .place")).toHaveCount(1);
  await page.getByRole("button", { name: /Old Boys Hostel/ }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
});
test("tile failures preserve directory and can be retried", async ({
  page,
}) => {
  await page.route("https://tile.openstreetmap.org/**", (route) =>
    route.abort(),
  );
  await page.goto("./");
  await page.locator("#open-map-center").click();
  await expect(page.locator("#map-status")).toContainText(
    "Map tiles unavailable",
  );
  await page.getByRole("searchbox").fill("old boys");
  await expect(page.locator("#results .place")).toHaveCount(1);
  await page.locator("#results .place").click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await page.unroute("https://tile.openstreetmap.org/**");
  await page.route("https://tile.openstreetmap.org/**", (route) =>
    route.fulfill({
      contentType: "image/png",
      body: Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=",
        "base64",
      ),
    }),
  );
  await page.locator("#open-map").click();
  await expect(page.locator("#map-status")).toBeEmpty();
});
