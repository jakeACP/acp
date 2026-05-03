import { db } from "./db";
import { budgetBaselines, budgetCategories } from "@shared/schema";
import { eq } from "drizzle-orm";

const FY2024_CATEGORIES = [
  { name: "Social Security", amountBillions: 1462, colorHex: "#3b82f6", sortOrder: 0 },
  { name: "National Defense", amountBillions: 874, colorHex: "#ef4444", sortOrder: 1 },
  { name: "Medicare", amountBillions: 869, colorHex: "#10b981", sortOrder: 2 },
  { name: "Net Interest on Debt", amountBillions: 870, colorHex: "#6b7280", sortOrder: 3, isLocked: true, lockedTooltip: "Net interest on the national debt is a contractual obligation. Defaulting would cause a global financial crisis and cannot be reduced through discretionary policy." },
  { name: "Medicaid & CHIP", amountBillions: 618, colorHex: "#8b5cf6", sortOrder: 4 },
  { name: "Veterans Benefits", amountBillions: 301, colorHex: "#f59e0b", sortOrder: 5 },
  { name: "Education & Job Training", amountBillions: 196, colorHex: "#06b6d4", sortOrder: 6 },
  { name: "Transportation & Infrastructure", amountBillions: 126, colorHex: "#84cc16", sortOrder: 7 },
  { name: "International Affairs & Foreign Aid", amountBillions: 72, colorHex: "#f97316", sortOrder: 8 },
  { name: "All Other Programs", amountBillions: 1364, colorHex: "#ec4899", sortOrder: 9 },
];

export async function seedFY2024Baseline(): Promise<void> {
  try {
    const existing = await db.select({ id: budgetBaselines.id })
      .from(budgetBaselines)
      .where(eq(budgetBaselines.isActive, true))
      .limit(1);

    if (existing.length > 0) return;

    const [baseline] = await db.insert(budgetBaselines).values({
      fiscalYear: 2024,
      sourceName: "Congressional Budget Office (CBO)",
      sourceUrl: "https://www.cbo.gov/publication/60039",
      totalOutlays: 6752,
      totalReceipts: 4919,
      deficit: 1833,
      isActive: true,
    }).returning();

    await db.insert(budgetCategories).values(
      FY2024_CATEGORIES.map((cat) => ({
        baselineId: baseline.id,
        name: cat.name,
        amountBillions: cat.amountBillions,
        colorHex: cat.colorHex,
        sortOrder: cat.sortOrder,
        isLocked: (cat as any).isLocked ?? false,
        lockedTooltip: (cat as any).lockedTooltip ?? null,
      }))
    );

    console.log("[budget-seed] FY 2024 CBO baseline seeded.");
  } catch (err: any) {
    console.error("[budget-seed] Failed to seed baseline:", err.message);
  }
}
