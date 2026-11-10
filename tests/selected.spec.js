import { expect, test } from "@playwright/test"

/* The work and the CV are on the page itself, for anyone who never presses a key. */

test("selected work is on the page without pressing a key", async ({ page }) => {
  await page.goto("/")
  const section = page.locator("section.selected")
  await expect(section.getByRole("heading", { name: "Selected work" })).toBeVisible()
  expect(await section.locator(".project-name").allTextContents()).toEqual([
    "llm-router",
    "evalboard",
    "semcache",
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

test("every selected card shows a real screenshot, chart or terminal output", async ({ page }) => {
  await page.goto("/")
  const cards = page.locator("section.selected .projects > li")
  const count = await cards.count()
  for (let i = 0; i < count; i++) {
    await expect(cards.nth(i).locator(".shot, .console")).toHaveCount(1)
  }
})

test("project images have alt text, load lazily and actually load", async ({ page }) => {
  await page.goto("/")
  await page.locator('section.selected button[data-open="work"]').click()
  const images = page.locator(".shot img")
  expect(await images.count()).toBe(5)
  for (const image of await images.all()) {
    await expect(image).toHaveAttribute("alt", /.{20,}/)
    await expect(image).toHaveAttribute("loading", "lazy")
    await image.scrollIntoViewIfNeeded()
    await expect.poll(() => image.evaluate((img) => img.complete && img.naturalWidth > 0)).toBe(true)
  }
})

test("no screenshot or terminal output spills out of its card", async ({ page }) => {
  await page.goto("/")
  await page.locator('section.selected button[data-open="work"]').click()
  const spilling = await page.evaluate(() =>
    [...document.querySelectorAll(".shot, .console")].filter((media) => {
      const card = media.closest(".projects > li").getBoundingClientRect()
      return media.getBoundingClientRect().right > card.right + 1
    }).length
  )
  expect(spilling).toBe(0)
})


test("every project of mine links to the steps for running it", async ({ page }) => {
  await page.goto("/")
  await page.locator('section.selected button[data-open="work"]').click()
  const mine = /^https:\/\/github\.com\/mohsinaliwork686-rgb\/[^/#]+$/
  let checked = 0
  for (const scope of ["section.selected", "dialog#work"]) {
    for (const item of await page.locator(`${scope} .projects > li`).all()) {
      const repo = await item.locator(".project-name").getAttribute("href")
      if (!repo || !mine.test(repo)) continue
      const run = item.getByRole("link", { name: /run it yourself/i })
      await expect(run).toHaveCount(1)
      await expect(run).toHaveAttribute("href", new RegExp(`^${repo.replace(/[.]/g, "\\.")}#[a-z0-9-]+$`))
      checked++
    }
  }
  expect(checked).toBe(10)
})

test("every project in the work section is a complete entry in a list", async ({ page }) => {
  await page.goto("/")
  await page.locator('section.selected button[data-open="work"]').click()
  const dialog = page.locator("dialog#work")
  const names = await dialog.locator(".project-name").count()
  expect(names).toBeGreaterThan(10)
  expect(await dialog.locator(".projects > li").count()).toBe(names)
  expect(await dialog.locator(".projects > li > .project-name").count()).toBe(names)
  expect(await dialog.locator(".highlights").count()).toBe(await dialog.locator(".projects > li > .highlights").count())
  expect(await dialog.locator(".tags").count()).toBe(await dialog.locator(".projects > li > .tags").count())
})
