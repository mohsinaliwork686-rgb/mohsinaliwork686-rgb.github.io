/*
 * The Portfolio Console: screen typing, the idle key wave, and the section dialogs.
 * No dependencies. Everything here is progressive: the page reads correctly before it runs.
 */
(() => {
  "use strict"

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)")
  const device = document.querySelector(".device")
  const keys = [...document.querySelectorAll("[data-keys] .key")]
  const dialogs = new Map([...document.querySelectorAll("dialog")].map((d) => [d.id, d]))

  const WELCOME = {
    title: "Mohsin's portfolio",
    desc: "Backend systems. Cloud pipelines. Tools for LLM apps.",
  }

  const CHAR_MS = 110
  const START_PAUSE_MS = 350
  const RESTORE_MS = 350
  const WAVE_EVERY_MS = 7000
  const FIRST_WAVE_MS = 2600
  const QUIET_AFTER_INTERACTION_MS = 2500

  const openDialog = () => [...dialogs.values()].find((d) => d.open) ?? null

  /** Keyboard focus specifically: a key keeps its title, and waves pause, only for that. */
  const keyHasKeyboardFocus = () => {
    const active = document.activeElement
    return keys.includes(active) && active.matches(":focus-visible")
  }

  // ------------------------------------------------------------------ screen typing

  const typedEl = document.querySelector("[data-title-typed]")
  const fullEl = document.querySelector("[data-title-full]")
  const descEl = document.querySelector("[data-desc]")
  const statusEl = document.querySelector("[data-status]")

  // One timer and one target. Starting new text always cancels the old timer first, so two
  // titles can never interleave, and asking for the text already on screen does nothing.
  let typingTimer = 0
  let target = null

  function type(title, desc, pause = 0) {
    if (title === target) return
    window.clearTimeout(typingTimer)
    target = title

    // The full title is always available to assistive technology. The animated characters
    // are hidden from it, and nothing is a live region, so typing is never read out letter
    // by letter.
    fullEl.textContent = title
    descEl.textContent = desc

    if (reduceMotion.matches) {
      typedEl.textContent = title
      statusEl.textContent = "READY"
      return
    }

    const characters = Array.from(title)
    let shown = 0
    typedEl.textContent = ""
    statusEl.textContent = "TYPING"

    const step = () => {
      shown += 1
      typedEl.textContent = characters.slice(0, shown).join("")
      if (shown < characters.length) {
        typingTimer = window.setTimeout(step, CHAR_MS)
      } else {
        statusEl.textContent = "READY"
      }
    }
    typingTimer = window.setTimeout(step, pause)
  }

  let restoreTimer = 0

  function scheduleRestore() {
    window.clearTimeout(restoreTimer)
    restoreTimer = window.setTimeout(() => {
      if (keyHasKeyboardFocus() || openDialog()) return
      type(WELCOME.title, WELCOME.desc)
    }, RESTORE_MS)
  }

  const cancelRestore = () => window.clearTimeout(restoreTimer)

  for (const key of keys) {
    const show = () => {
      cancelRestore()
      type(key.dataset.title, key.dataset.desc)
    }
    key.addEventListener("pointerenter", show)
    // Only real keyboard focus types a title. Focus handed back after a mouse click on
    // Close should not suddenly start typing.
    key.addEventListener("focus", () => {
      if (key.matches(":focus-visible")) show()
    })
    key.addEventListener("pointerleave", scheduleRestore)
    key.addEventListener("blur", scheduleRestore)
  }

  reduceMotion.addEventListener("change", () => {
    if (!reduceMotion.matches || target === null) return
    window.clearTimeout(typingTimer)
    typedEl.textContent = target
    statusEl.textContent = "READY"
  })

  // ----------------------------------------------------------------------- idle wave

  let lastInteraction = 0
  const noteInteraction = () => { lastInteraction = performance.now() }

  device.addEventListener("pointermove", noteInteraction)
  device.addEventListener("pointerdown", noteInteraction)
  // Starting to interact ends any wave in progress, so a hover never fights the animation.
  device.addEventListener("pointerenter", () => keys.forEach((k) => k.classList.remove("pop")))

  function wavePaused() {
    return (
      reduceMotion.matches ||
      document.hidden ||
      openDialog() !== null ||
      keyHasKeyboardFocus() ||
      device.matches(":hover") ||
      performance.now() - lastInteraction < QUIET_AFTER_INTERACTION_MS
    )
  }

  function wave() {
    if (wavePaused()) return
    for (const key of keys) {
      key.classList.remove("pop")
      void key.offsetWidth // restart the animation if a previous one is still attached
      key.classList.add("pop")
    }
  }

  for (const key of keys) {
    key.addEventListener("animationend", (event) => {
      if (event.animationName === "pop") key.classList.remove("pop")
    })
  }

  window.setTimeout(wave, FIRST_WAVE_MS)
  window.setInterval(wave, WAVE_EVERY_MS)

  // ------------------------------------------------------------------------- dialogs

  let opener = null

  function open(id, trigger) {
    const dialog = dialogs.get(id)
    if (!dialog || dialog.open) return
    opener = trigger
    cancelRestore()
    keys.forEach((k) => k.classList.remove("pop"))
    // showModal makes the rest of the page inert, keeps focus inside, and closes on Escape.
    dialog.showModal()
  }

  document.addEventListener("click", (event) => {
    const trigger = event.target.closest("[data-open]")
    if (trigger) open(trigger.dataset.open, trigger)
  })

  for (const dialog of dialogs.values()) {
    dialog.querySelector("[data-close]").addEventListener("click", () => dialog.close())

    // A click on the backdrop lands on the dialog element itself. Require the press to start
    // there too, so selecting text inside and releasing outside does not close it.
    let pressedOnBackdrop = false
    dialog.addEventListener("pointerdown", (event) => { pressedOnBackdrop = event.target === dialog })
    dialog.addEventListener("click", (event) => {
      if (pressedOnBackdrop && event.target === dialog) dialog.close()
    })

    dialog.addEventListener("close", () => {
      const returnTo = opener
      opener = null
      if (returnTo && document.contains(returnTo)) returnTo.focus({ preventScroll: true })
      scheduleRestore()
    })
  }

  // ------------------------------------------------------------------------- start up

  // The title is in the page already, so it reads correctly without this script. Clear it
  // and type it in after a short pause on the caret.
  target = null
  type(WELCOME.title, WELCOME.desc, START_PAUSE_MS)
})()
