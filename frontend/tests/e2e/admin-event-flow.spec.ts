import { expect, test } from "@playwright/test";

const canRunE2E =
  Boolean(process.env.E2E_BASE_URL) &&
  Boolean(process.env.E2E_ADMIN_EMAIL) &&
  Boolean(process.env.E2E_ADMIN_PASSWORD);

test.describe("admin event vertical slice", () => {
  test.skip(!canRunE2E, "Set E2E_BASE_URL, E2E_ADMIN_EMAIL, and E2E_ADMIN_PASSWORD to run.");

  test("admin login, create event, add category, preview, publish, and public open", async ({
    page,
  }) => {
    const slug = `e2e-virtual-run-${Date.now()}`;

    await page.goto("/admin/login");
    await page.getByLabel("Email").fill(process.env.E2E_ADMIN_EMAIL ?? "");
    await page.getByLabel("Password").fill(process.env.E2E_ADMIN_PASSWORD ?? "");
    await page.getByRole("button", { name: "Masuk" }).click();
    await expect(page.getByRole("heading", { name: "Operasional event" })).toBeVisible();

    await page.getByRole("link", { name: "Buat event" }).click();
    await page.getByLabel("Nama event").fill("E2E Virtual Run");
    await page.getByLabel("Slug").fill(slug);
    await page
      .getByLabel("Deskripsi pendek")
      .fill("Event E2E untuk memeriksa alur admin sampai public landing.");
    await page
      .getByLabel("Tentang event")
      .fill("Event ini dibuat oleh Playwright untuk memeriksa vertical slice event management.");
    await page
      .getByLabel("Instruksi pendaftaran")
      .fill("Peserta akan memilih kategori dan mengisi data saat fitur registrasi tersedia.");
    await page
      .getByLabel("Instruksi upload")
      .fill("Peserta akan mengunggah hasil saat fitur upload tersedia.");
    await page
      .getByLabel("Syarat dan ketentuan")
      .fill("Peserta wajib mengikuti aturan event yang ditetapkan organizer.");
    await page.getByRole("button", { name: "Simpan draft" }).click();
    await expect(page.getByText("published")).not.toBeVisible();

    await page.getByRole("link", { name: "Kelola kategori" }).click();
    await page.getByLabel("Nama kategori").first().fill("5K Challenge");
    await page.getByLabel("Slug kategori").first().fill("5k-challenge");
    await page.getByLabel("Jarak meter").first().fill("5000");
    await page.getByRole("button", { name: "Tambah kategori" }).click();
    await expect(page.getByText("5K Challenge")).toBeVisible();

    await page.getByRole("link", { name: "Kembali ke event" }).click();
    await page.getByRole("link", { name: "Preview public" }).click();
    await expect(page.getByText("Preview admin")).toBeVisible();
    await page.getByRole("link", { name: "Kembali ke editor" }).click();
    await page.goto("/admin/events");
    await page.getByText("E2E Virtual Run").click();
    await page.getByRole("button", { name: "Publish event" }).click();
    await page.goto(`/events/${slug}`);
    await expect(page.getByRole("heading", { name: "E2E Virtual Run" })).toBeVisible();
  });

  test("unauthorized user is redirected away from admin route", async ({ page }) => {
    await page.goto("/admin/events");
    await expect(page).toHaveURL(/\/admin\/login/);
  });
});
