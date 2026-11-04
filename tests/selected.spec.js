import { expect, test } from "@playwright/test"

/* The work and the CV are on the page itself, for anyone who never presses a key. */

test("selected work is on the page without pressing a key", async ({ page }) => {
  await page.goto("/")
  const section = page.locator("section.selected")
  await expect(section.getByRole("heading", { name: "Selected work" })).toBeVisible()
  expect(await section.locator(".project-name").allTextContents()).toEqual([
    "llm-router",
    "evalboard",
    "ragsweep",
    "StackExchange.Redis",
  ])
  for (const link of await section.locator("a.project-name").all()) {
    await expect(link).toHaveAttribute("href", /^https:\/\/github\.com\//)
  }
})

test("selected work links to every project", async ({ page }) => {
  await page.goto("/")
  await page.locator('section.selected button[data-open="work"]').click()
  await expect(page.locator("dialog#work")).toBeVisible()
})

test("every CV link points to a PDF that exists", async ({ page, request }) => {
  await page.goto("/")
  const hrefs = await page
    .locator('a[href$=".pdf"]')
    .evaluateAll((links) => links.map((link) => link.getAttribute("href")))
  expect(hrefs.length).toBeGreaterThanOrEqual(2)
  for (const href of new Set(hrefs)) {
    const response = await request.get(href)
    expect(response.status()).toBe(200)
    expect(response.headers()["content-type"]).toContain("pdf")
  }
})
