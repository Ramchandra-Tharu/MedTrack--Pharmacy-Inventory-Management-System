import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/db";
import { Medicine } from "@/lib/models/Medicine";
import { Batch } from "@/lib/models/Batch";

// GET: Fetch all inventory
export async function GET() {
  try {
    await connectToDatabase();

    const batches = await Batch.find()
      .populate("medicineId")
      .sort({ expirationDate: 1 });

    return NextResponse.json(
      {
        success: true,
        data: batches,
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

// POST: Add new inventory batch
export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();

    const body = await request.json();

    const {
      medicineId,
      batchNumber,
      quantity,
      purchasePrice,
      sellingPrice,
      expirationDate,
      receivedDate,
    } = body;

    // Check required fields
    if (
      !medicineId ||
      !batchNumber ||
      quantity === undefined ||
      purchasePrice === undefined ||
      sellingPrice === undefined ||
      !expirationDate
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Required fields are missing",
        },
        { status: 400 }
      );
    }

    // Check whether medicine exists
    const medicine = await Medicine.findById(medicineId);

    if (!medicine) {
      return NextResponse.json(
        {
          success: false,
          message: "Medicine not found",
        },
        { status: 404 }
      );
    }

    // Check duplicate batch number
    const existingBatch = await Batch.findOne({ batchNumber });

    if (existingBatch) {
      return NextResponse.json(
        {
          success: false,
          message: "Batch number already exists",
        },
        { status: 409 }
      );
    }

    // Create new batch
    const batch = await Batch.create({
      medicineId,
      batchNumber,
      quantity,
      purchasePrice,
      sellingPrice,
      expirationDate,
      receivedDate,
    });

    // Return batch with medicine information
    const populatedBatch = await batch.populate("medicineId");

    return NextResponse.json(
      {
        success: true,
        message: "Inventory added successfully",
        data: populatedBatch,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Inventory POST error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to add inventory",
      },
      { status: 500 }
    );
  }
}