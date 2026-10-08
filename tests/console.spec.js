import { expect, test } from "@playwright/test"

/*
 * The verification list from the design brief, as tests:
 *   every cap stays in its well, the screen never overflows, all sections open, Escape and
 *   focus return work, fast movement between keys cancels old typing, and reduced motion
 *   is honoured. Run at desktop, tablet and phone widths.
 */

const WELCOME = "Mohsin's portfolio"

const typed = (page) => page.locator("[data-title-typed]")
const status = (page) => page.locator("[data-status]")
const keyByLabel = (page, label) => page.locator(`.key[aria-label="${label}"]`)

/** Park the pointer somewhere neutral, away from the device. */
async function pointerAway(page) {
  await page.mouse.move(5, 5)
}

test.describe("layout", () => {
  test("never scrolls sideways", async ({ page }) => {
    await page.goto("/")
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    )
    expect(overflow).toBe(0)
  })

  test("keeps every key at its photo coordinates, so nothing drifts as the page resizes", async ({ page }) => {
    await page.goto("/")
    const drift = await page.evaluate(() => {
      const device = document.querySelector(".device").getBoundingClientRect()
      return [...document.querySelectorAll(".key")].map((key) => {
        const style = key.style
        const r = key.getBoundingClientRect()
        const expectedX = Number(style.getPropertyValue("--cx")) / 1536
        const expectedY = Number(style.getPropertyValue("--cy")) / 1024
        const actualX = (r.left + r.width / 2 - device.left) / device.width
        const actualY = (r.top + r.height / 2 - device.top) / device.height
        return Math.max(Math.abs(actualX - expectedX), Math.abs(actualY - expectedY))
      })
    })
    expect(drift).toHaveLength(11)
    for (const d of drift) expect(d).toBeLessThan(0.002)
  })

  test("fits every title the screen can show inside the screen", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" })
    await page.goto("/")
    const titles = await page.locator(".key").evaluateAll((keys) => keys.map((k) => k.dataset.title))
    for (const title of [WELCOME, ...titles]) {
      const fits = await page.evaluate((text) => {
        const heading = document.querySelector(".screen-title")
        document.querySelector("[data-title-typed]").textContent = text
        return heading.scrollWidth <= heading.clientWidth + 1
      }, title)
      expect(fits, `"${title}" overflows the screen`).toBe(true)
    }
  })

  test("gives each key a full accessible name", async ({ page }) => {
    await page.goto("/")
    const names = await page.locator(".key").evaluateAll((keys) => keys.map((k) => k.getAttribute("aria-label")))
    expect(names).toHaveLength(11)
    for (const name of names) expect(name?.length).toBeGreaterThan(3)
  })
})

test.describe("screen typing", () => {
  test("types the welcome title one character at a time after a short pause", async ({ page }) => {
    await page.goto("/")
    await page.waitForTimeout(700)
    const partial = await typed(page).textContent()
    expect(partial.length).toBeGreaterThan(0)
    expect(partial.length).toBeLessThan(WELCOME.length)
    expect(WELCOME.startsWith(partial)).toBe(true)
    await expect(status(page)).toHaveText("TYPING")
    await expect(typed(page)).toHaveText(WELCOME, { timeout: 5000 })
    await expect(status(page)).toHaveText("READY")
  })

  test("keeps the complete title available to screen readers while typing", async ({ page }) => {
    await page.goto("/")
    await expect(page.locator("[data-title-full]")).toHaveText(WELCOME)
  })

  test("cancels unfinished typing when a new key is chosen, never mixing the two", async ({ page }) => {
    await page.goto("/")
    const first = keyByLabel(page, "P: Selected work")
    const second = keyByLabel(page, "T: Skills")
    await first.hover()
    await page.waitForTimeout(250)
    await second.hover()

    const target = "Skills"
    const samples = []
    for (let i = 0; i < 30; i += 1) {
      samples.push(await typed(page).textContent())
      await page.waitForTimeout(40)
    }
    for (const sample of samples) {
      expect(target.startsWith(sample), `saw "${sample}" while typing "${target}"`).toBe(true)
    }
    await expect(typed(page)).toHaveText(target)
  })

  test("ignores a request for the text already on screen", async ({ page }) => {
    await page.goto("/")
    const key = keyByLabel(page, "R: Experience")
    await key.hover()
    await expect(typed(page)).toHaveText("Experience", { timeout: 4000 })
    // Leave and come straight back, inside the restore delay: same text, so no retype.
    await pointerAway(page)
    await key.hover()
    await expect(typed(page)).toHaveText("Experience")
    await expect(status(page)).toHaveText("READY")
  })

  test("restores the welcome title after the pointer leaves the keys", async ({ page }) => {
    await page.goto("/")
    await keyByLabel(page, "O: About me").hover()
    await expect(typed(page)).toHaveText("About me", { timeout: 4000 })
    await pointerAway(page)
    await expect(typed(page)).toHaveText(WELCOME, { timeout: 5000 })
  })
})

test.describe("sections", () => {
  const sections = [
    ["Work", "work"],
    ["About", "about"],
    ["Experience", "experience"],
    ["Skills", "skills"],
  ]

  for (const [label, id] of sections) {
    test(`the ${label} navigation opens its section, and Escape returns focus`, async ({ page }) => {
      await page.goto("/")
      const trigger = page.locator(`nav button[data-open="${id}"]`)
      await trigger.click()
      const dialog = page.locator(`dialog#${id}`)
      await expect(dialog).toBeVisible()
      await page.keyboard.press("Escape")
      await expect(dialog).toBeHidden()
      await expect(trigger).toBeFocused()
    })
  }

  test("every content key opens the section it names", async ({ page }) => {
    await page.goto("/")
    const keys = page.locator(".key[data-open]")
    const count = await keys.count()
    expect(count).toBe(9)
    for (let i = 0; i < count; i += 1) {
      const key = keys.nth(i)
      const id = await key.getAttribute("data-open")
      await key.click()
      await expect(page.locator(`dialog#${id}`)).toBeVisible()
      await page.locator(`dialog#${id} [data-close]`).click()
      await expect(page.locator(`dialog#${id}`)).toBeHidden()
    }
  })

  test("works from the keyboard alone, with focus kept inside and handed back", async ({ page }) => {
    await page.goto("/")
    const key = keyByLabel(page, "T: Skills")
    await key.focus()
    await page.keyboard.press("Enter")
    const dialog = page.locator("dialog#skills")
    await expect(dialog).toBeVisible()
    await expect(dialog.locator("[data-close]")).toBeFocused()
    await page.keyboard.press("Escape")
    await expect(dialog).toBeHidden()
    await expect(key).toBeFocused()
  })

  test("closes when the backdrop is clicked", async ({ page }) => {
    await page.goto("/")
    await page.locator('nav button[data-open="about"]').click()
    const dialog = page.locator("dialog#about")
    await expect(dialog).toBeVisible()
    await page.mouse.click(4, 4)
    await expect(dialog).toBeHidden()
  })

  test("the contact keys are links to the contact section", async ({ page }) => {
    await page.goto("/")
    await keyByLabel(page, "Let's talk, go to contact").click()
    await expect(page).toHaveURL(/#contact$/)
  })
})

test.describe("idle wave", () => {
  test("pops the keys after a few quiet seconds", async ({ page }) => {
    await page.goto("/")
    await pointerAway(page)
    await expect(page.locator(".key.pop").first()).toBeAttached({ timeout: 5000 })
  })

  test("stays still while a section is open", async ({ page }) => {
    await page.goto("/")
    await page.locator('nav button[data-open="skills"]').click()
    await page.waitForTimeout(3200)
    await expect(page.locator(".key.pop")).toHaveCount(0)
  })

  test("stays still while a key has keyboard focus", async ({ page }) => {
    await page.goto("/")
    await page.keyboard.press("Shift") // a keyboard interaction, so the focus below counts as keyboard focus
    const key = keyByLabel(page, "R: Experience")
    await key.focus()
    expect(await key.evaluate((el) => el.matches(":focus-visible"))).toBe(true)
    await page.waitForTimeout(3200)
    await expect(page.locator(".key.pop")).toHaveCount(0)
  })
})

test.describe("reduced motion", () => {
  test.use({ reducedMotion: "reduce" })

  test("shows the complete title at once", async ({ page }) => {
    await page.goto("/")
    await expect(typed(page)).toHaveText(WELCOME)
    await expect(status(page)).toHaveText("READY")
  })

  test("never runs the idle wave", async ({ page }) => {
    await page.goto("/")
    await pointerAway(page)
    await page.waitForTimeout(3200)
    await expect(page.locator(".key.pop")).toHaveCount(0)
  })

  test("still opens every section", async ({ page }) => {
    await page.goto("/")
    await keyByLabel(page, "P: Selected work").click()
    await expect(page.locator("dialog#work")).toBeVisible()
  })
})
