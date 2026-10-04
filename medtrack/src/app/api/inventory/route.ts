import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/db";
import { Medicine } from "@/lib/models/Medicine";
import { Batch } from "@/lib/models/Batch";

// GET: Get inventory status (medicines with stock levels)
export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search");
    const status = searchParams.get("status");

    const medicineFilter: Record<string, unknown> = {};

    if (search) {
      medicineFilter.$or = [
        { name: { $regex: search, $options: "i" } },
        { genericName: { $regex: search, $options: "i" } },
      ];
    }

    if (status) {
      medicineFilter.status = status;
    }

    const medicines = await Medicine.find(medicineFilter).lean();
    
    // Get all batches for these medicines
    const medicineIds = medicines.map(m => m._id);
    const batches = await Batch.find({ medicineId: { $in: medicineIds } }).lean();

    const inventory = medicines.map(medicine => {
      const medicineBatches = batches.filter(
        b => b.medicineId.toString() === medicine._id.toString()
      );

      const totalStock = medicineBatches.reduce((sum, b) => sum + b.quantity, 0);
      const totalValue = medicineBatches.reduce((sum, b) => sum + (b.quantity * b.purchasePrice), 0);

      return {
        ...medicine,
        totalStock,
        totalValue,
        batchCount: medicineBatches.length,
      };
    });

    return NextResponse.json(
      {
        success: true,
        count: inventory.length,
        data: inventory,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Inventory GET error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch inventory",
      },
      { status: 500 }
    );
  }
}