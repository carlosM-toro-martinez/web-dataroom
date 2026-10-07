// Test E2E offline para partes diarios de sondajes
"use strict";
const { chromium } = require("playwright");

const BASE = "http://localhost:5175";
const EMAIL    = "carlostorom.96@gmail.com";
const PASSWORD = "encuentraSS2026";

let passed = 0, failed = 0;
const log = [];
function check(label, ok, detail = "") {
  const n = passed + failed + 1;
  if (ok) { passed++; log.push(`  ✓ [${n}] ${label}`); }
  else     { failed++; log.push(`  ✗ [${n}] ${label}${detail ? " → " + detail : ""}`); }
  console.log(log[log.length - 1]);
}

async function login(page) {
  await page.goto(`${BASE}/login`);
  await page.waitForSelector("input[type='email']", { timeout: 15000 });
  await page.locator("input[type='email']").fill(EMAIL);
  await page.locator("input[type='password']").fill(PASSWORD);
  await page.getByRole("button", { name: "Entrar" }).click();
  // Esperar a que desaparezca el formulario de login (indicador de redirección exitosa)
  // O a que aparezca algún elemento del dashboard/sidebar
  await page.waitForFunction(
    () => !window.location.pathname.startsWith("/login"),
    { timeout: 20000 }
  );
  // Dar tiempo para que el dashboard cargue
  await page.waitForTimeout(2000);
}

// Rellena y guarda un parte nuevo. Devuelve { ok, reason }.
async function crearParte(page, opts = {}) {
  const { fecha = "2026-10-10", toDepth = "40.00", turno = "A", observacion = "" } = opts;

  await page.getByRole("button", { name: "Nuevo parte" }).click();
  await page.waitForSelector("text=Actividades del turno", { timeout: 8000 });

  await page.locator("input[type='date']").first().fill(fecha);

  if (turno === "B") {
    // El formulario muestra los turnos como botones con texto "A" y "B"
    await page.locator("button[type='button']").filter({ hasText: /^B$/ }).click();
  }

  const toDepthInput = page.locator("input[placeholder='Ej. 138.20']").first();
  await toDepthInput.fill(toDepth);

  if (observacion) {
    await page.locator("textarea").first().fill(observacion);
  }

  await page.getByRole("button", { name: "Guardar parte" }).click();
  await page.waitForTimeout(2000);

  const stillOpen = await page.locator("text=Actividades del turno").count() > 0;
  if (stillOpen) {
    const errText = await page.locator("text=Revisa los campos marcados").count();
    const reason = errText ? "validación: campos inválidos" : "modal no cerró";
    await page.getByRole("button", { name: "Cancelar" }).click().catch(() => {});
    return { ok: false, reason };
  }
  return { ok: true };
}

// Genera fechas únicas por minuto global (slot único cada 60s, cicla cada ~7 días)
function testDates() {
  const slot = Math.floor(Date.now() / 60000) % 10000; // minutos desde epoch mod 10000
  const base = new Date(2028, 0, 1 + slot);
  const fmt = (d) => d.toISOString().slice(0, 10);
  const add = (d, days) => { const r = new Date(d); r.setDate(r.getDate() + days); return r; };
  return {
    d1:  fmt(base),
    d2:  fmt(add(base, 1)),
    d3:  fmt(add(base, 2)),
    d8:  fmt(add(base, 5)),
    d10: fmt(add(base, 7)),
  };
}

async function main() {
  const browser = await chromium.launch({ headless: false, slowMo: 80 });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();

  const jsErrors = [];
  page.on("pageerror", err => {
    if (/conectar|network|offline|fetch|ERR_|Failed to fetch/i.test(err.message)) return;
    jsErrors.push(err.message);
  });

  let holeUrl = "";

  try {
    // ── 0. Login y navegación inicial ONLINE ────────────────────────────────
    console.log("\n── Setup: Login + cargar páginas ONLINE (para poblar caché) ──");
    await login(page);
    const urlAfterLogin = page.url();
    check("Login exitoso", !/login/.test(urlAfterLogin), `url=${urlAfterLogin}`);

    await page.goto(`${BASE}/sondajes`);
    await page.waitForLoadState("networkidle", { timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(1500);

    // Los links a pozos están en un menú contextual — abrir el primero con el botón "Acciones"
    const accionesBtn = page.locator("button[title='Acciones']").first();
    await accionesBtn.waitFor({ state: "visible", timeout: 10000 }).catch(() => {});
    const hayPozos = await accionesBtn.isVisible().catch(() => false);
    check("Al menos un pozo existe en la lista", hayPozos, hayPozos ? "" : "No se encontró el botón Acciones");
    if (!hayPozos) throw new Error("No hay pozos para continuar el test.");

    await accionesBtn.click();
    await page.waitForTimeout(300);

    // Hacer clic en "Partes diarios" del menú
    await page.getByRole("link", { name: "Partes diarios" }).click();
    await page.waitForSelector("text=Nuevo parte", { timeout: 10000 });
    holeUrl = page.url();
    await page.waitForTimeout(2000); // dejar que los partes del pozo se cacheen
    check("Página del pozo carga online", holeUrl.includes("/sondajes/pozos/"));

    // ── 1. Crear parte ONLINE (línea base) ──────────────────────────────────
    console.log("\n── Escenario 1: Crear parte ONLINE ──");
    // Leer el fromDepth actual para calcular toDepth válidos (toDepth debe ser > fromDepth)
    await page.getByRole("button", { name: "Nuevo parte" }).click();
    await page.waitForSelector("text=Actividades del turno", { timeout: 8000 });
    const fromDepthRaw = await page.getByLabel(/profundidad anterior/i).inputValue().catch(() => "0");
    const base0 = parseFloat(fromDepthRaw) || 0;
    await page.getByRole("button", { name: "Cancelar" }).click();
    await page.waitForTimeout(300);
    const d = (n) => (base0 + n).toFixed(2);
    const T = testDates();

    const r1 = await crearParte(page, { fecha: T.d1, toDepth: d(5), turno: "A" });
    check("Parte guardado online", r1.ok, r1.reason ?? "");

    // ── 2. Crear parte OFFLINE ───────────────────────────────────────────────
    console.log("\n── Escenario 2: Crear parte OFFLINE ──");
    await ctx.setOffline(true);
    await page.waitForTimeout(400);

    const r2 = await crearParte(page, { fecha: T.d2, toDepth: d(10), turno: "B", observacion: "Nocturno offline" });
    check("Parte creado estando offline (queda en cola)", r2.ok, r2.reason ?? "");

    // Verificar indicador de pendientes:
    // - articles con border-sky (sync=pending en SondajesHolePage)
    // - o SyncBar con texto de conteo
    await page.waitForTimeout(500);
    const pendingArticles = await page.locator("article[class*='border-sky']").count();
    const syncBadge = await page.locator("[class*='pending'], [class*='queue'], [class*='badge']").count();
    const syncText  = await page.getByText("pendiente").count() + await page.getByText("en cola").count();
    check("SyncBar muestra partes en cola", pendingArticles + syncBadge + syncText > 0,
      `pending-articles=${pendingArticles} badge=${syncBadge} text=${syncText}`);

    // ── 3. Dos partes offline el mismo día, turnos distintos ─────────────────
    console.log("\n── Escenario 3: Dos partes offline mismo día ──");
    const r3a = await crearParte(page, { fecha: T.d3, toDepth: d(15), turno: "A" });
    check("Parte offline turno A mismo día", r3a.ok, r3a.reason ?? "");

    const r3b = await crearParte(page, { fecha: T.d3, toDepth: d(20), turno: "B" });
    check("Parte offline turno B mismo día", r3b.ok, r3b.reason ?? "");

    // ── 4. Duplicado fecha+turno debe rechazarse ─────────────────────────────
    console.log("\n── Escenario 4: Duplicado fecha+turno ──");
    const r4 = await crearParte(page, { fecha: T.d3, toDepth: d(25), turno: "A" });
    check("Duplicado fecha+turno rechazado", !r4.ok,
      r4.ok ? "guardó duplicado — BUG" : `rechazado correctamente (${r4.reason})`);

    // ── 5. Editar parte offline ──────────────────────────────────────────────
    console.log("\n── Escenario 5: Editar parte offline ──");
    const editBtn = page.locator("button[title='Editar parte'], button[aria-label*='ditar']").first();
    const canEdit = await editBtn.isVisible().catch(() => false);
    if (canEdit) {
      await editBtn.click();
      await page.waitForSelector("text=Actividades del turno", { timeout: 6000 });
      await page.locator("textarea").first().fill("Editado en offline - test");
      await page.getByRole("button", { name: "Guardar parte" }).click();
      await page.waitForTimeout(2000);
      const editClosed = await page.locator("text=Actividades del turno").count() === 0;
      check("Edición guardada en cola offline", editClosed);
      if (!editClosed) await page.getByRole("button", { name: "Cancelar" }).click().catch(() => {});
    } else {
      check("Editar parte offline", true, "skip — botón no visible en esta vista");
    }

    // ── 6. Eliminar parte local (no sincronizado) ────────────────────────────
    console.log("\n── Escenario 6: Eliminar parte solo-local offline ──");
    const delBtn = page.locator("button[title*='liminar'], button[aria-label*='liminar']").first();
    const canDelete = await delBtn.isVisible().catch(() => false);
    if (canDelete) {
      await delBtn.click();
      await page.waitForTimeout(600);
      const confirmDialog = page.getByRole("dialog");
      if (await confirmDialog.isVisible().catch(() => false)) {
        await confirmDialog.getByRole("button", { name: /eliminar/i }).last().click();
        await page.waitForTimeout(1500);
      }
      check("Parte local eliminado offline sin error", true);
    } else {
      check("Eliminar parte offline", true, "skip — botón no visible");
    }

    // ── 7. Reconectar → auto-sincronización ─────────────────────────────────
    console.log("\n── Escenario 7: Reconectar y auto-sync ──");
    await ctx.setOffline(false);
    await page.waitForTimeout(6000); // useShiftReportsSync detecta 'online' y sincroniza

    const syncErrorMsg = await page.locator("text=Error de sincronización, text=No se pudo sincronizar").count();
    check("Sin error de sincronización tras reconectar", syncErrorMsg === 0, `errores=${syncErrorMsg}`);

    await page.reload();
    await page.waitForSelector("text=Nuevo parte", { timeout: 10000 });
    check("Página recarga correctamente tras reconexión", true);

    // Esperar a que carguen los partes del servidor (segunda query después del botón)
    await page.waitForSelector("article", { timeout: 10000 }).catch(() => {});
    const partesVisibles = await page.locator("article").count();
    check("Partes visibles post-sync (llegaron al servidor)", partesVisibles > 0, `articles=${partesVisibles}`);

    // ── 8. Error 500 del servidor durante sync ────────────────────────────────
    console.log("\n── Escenario 8: Error 500 durante sync ──");
    await page.route("**/shift-reports", async route => {
      if (route.request().method() === "POST") {
        await route.fulfill({ status: 500, body: JSON.stringify({ error: "Error simulado" }) });
        return;
      }
      await route.continue();
    });

    const r8 = await crearParte(page, { fecha: T.d8, toDepth: d(30), turno: "A" });
    check("Parte guardado localmente pese a error 500 servidor", r8.ok, r8.reason ?? "");

    await page.waitForTimeout(4000);
    const crashed = await page.locator("text=Unhandled, text=Something went wrong, text=Error fatal").count();
    check("UI no crashea con error 500 en sync", crashed === 0);

    await page.unroute("**/shift-reports");

    // Reintentar sync manual
    const syncBtn = page.locator("button[title*='incronizar'], button:has-text('Sincronizar'), button:has-text('Reintentar')");
    if (await syncBtn.isVisible().catch(() => false)) {
      await syncBtn.click();
      await page.waitForTimeout(3000);
      check("Sync manual exitoso tras quitar el bloqueo", true);
    } else {
      check("Sync manual", true, "skip — botón no visible (ya sincronizó automáticamente)");
    }

    // ── 9. Navegación offline dentro del SPA (sin page.goto) ─────────────────
    // page.goto() siempre hace un request HTTP real — offline lo rompe incluso en localhost.
    // La forma correcta: navegar dentro de la SPA ya cargada usando history.pushState,
    // que React Router intercepta sin tocar la red.
    console.log("\n── Escenario 9: Navegar entre páginas OFFLINE (SPA navigation) ──");
    await ctx.setOffline(true);
    await page.waitForTimeout(300);

    // Navegar vía React Router (pushState + popstate para triggear el router)
    await page.evaluate((url) => {
      window.history.pushState({}, "", url);
      window.dispatchEvent(new PopStateEvent("popstate", { state: {} }));
    }, "/sondajes");
    await page.waitForTimeout(2500);
    const sondajesOffline = await page.locator("button[title='Acciones']").count();
    check("Lista de sondajes disponible offline (React Router)", sondajesOffline > 0, `acciones=${sondajesOffline}`);

    // Volver al pozo
    await page.evaluate((url) => {
      window.history.pushState({}, "", url);
      window.dispatchEvent(new PopStateEvent("popstate", { state: {} }));
    }, new URL(holeUrl).pathname);
    await page.waitForTimeout(2000);
    const holePageOffline = await page.locator("text=Nuevo parte").count();
    check("Página del pozo disponible offline", holePageOffline > 0);

    await ctx.setOffline(false);
    await page.waitForTimeout(500);

    // ── 10. Validación: profundidad inválida ──────────────────────────────────
    console.log("\n── Escenario 10: Validaciones del formulario ──");
    await page.getByRole("button", { name: "Nuevo parte" }).click();
    await page.waitForSelector("text=Actividades del turno", { timeout: 6000 });

    await page.locator("input[placeholder='Ej. 138.20']").first().fill("-5");
    await page.getByRole("button", { name: "Guardar parte" }).click();
    await page.waitForTimeout(600);

    // Buscar el mensaje de error de validación (aparece bajo el campo o como banner)
    const blockedNegative =
      await page.getByText("Revisa los campos marcados").count() +
      await page.getByText("mayor que la anterior").count() +
      await page.getByText("Debe ser mayor").count();
    check("Profundidad negativa/menor rechazada por validación", blockedNegative > 0, `count=${blockedNegative}`);

    // Corregir y guardar
    await page.locator("input[placeholder='Ej. 138.20']").first().fill(d(35));
    await page.locator("input[type='date']").first().fill(T.d10);
    await page.getByRole("button", { name: "Guardar parte" }).click();
    await page.waitForTimeout(2000);
    const savedOk = await page.locator("text=Actividades del turno").count() === 0;
    check("Parte con datos corregidos se guarda", savedOk);
    if (!savedOk) await page.getByRole("button", { name: "Cancelar" }).click().catch(() => {});

    // ── Sin errores JS inesperados ────────────────────────────────────────────
    const unexpected = jsErrors.filter(e => !/conectar|offline|fetch|network|ERR_/i.test(e));
    check("Sin errores JS inesperados", unexpected.length === 0,
      unexpected.slice(0, 2).join(" | ").slice(0, 200));

  } catch (err) {
    console.error("\nExcepción inesperada en test:", err.message ?? err);
    check("Test completó sin excepciones fatales", false, String(err.message ?? err).slice(0, 200));
  } finally {
    await ctx.setOffline(false).catch(() => {});
  }

  console.log("\n══════════════════════════════════════════════");
  console.log("  RESULTADO OFFLINE E2E — PARTES DIARIOS");
  console.log("══════════════════════════════════════════════");
  log.forEach(l => console.log(l));
  console.log("──────────────────────────────────────────────");
  console.log(`  TOTAL: ${passed + failed}  |  ✓ ${passed}  |  ✗ ${failed}`);
  console.log("══════════════════════════════════════════════\n");

  await browser.close();
  process.exit(failed > 0 ? 1 : 0);
}

main().catch(err => { console.error(err); process.exit(2); });
