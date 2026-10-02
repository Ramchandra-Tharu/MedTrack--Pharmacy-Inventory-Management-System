import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/db";
import { Medicine } from "@/lib/models/Medicine";
import { Batch } from "@/lib/models/Batch";
import { Sale } from "@/lib/models/Sale";

export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();

    const body = await request.json();

    const { medicineId, quantity } = body;

    // Check required fields
    if (!medicineId || !quantity) {
      return NextResponse.json(
        {
          success: false,
          message: "Medicine ID and quantity are required",
        },
        { status: 400 }
      );
    }

    // Find medicine
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

    // Find the earliest valid batch
    const batch = await Batch.findOne({
      medicineId,
      quantity: { $gt: 0 },
      expirationDate: { $gt: new Date() },
    }).sort({
      expirationDate: 1,
    });

    if (!batch) {
      return NextResponse.json(
        {
          success: false,
          message: "No valid stock available for this medicine",
        },
        { status: 400 }
      );
    }

    // Check available quantity
    if (batch.quantity < quantity) {
      return NextResponse.json(
        {
          success: false,
          message: `Insufficient stock in the earliest-expiring batch. Available quantity: ${batch.quantity}`,
        },
        { status: 400 }
      );
    }

    // Use the batch's selling price
    const unitPrice = batch.sellingPrice;

    // Calculate total
    const totalPrice = quantity * unitPrice;

    // Reduce stock
    batch.quantity -= quantity;
    await batch.save();

    // Create sale
    const sale = await Sale.create({
      medicineId,
      batchId: batch._id,
      quantity,
      unitPrice,
      totalPrice,
    });

    const populatedSale = await sale.populate([
      { path: "medicineId" },
      { path: "batchId" },
    ]);

    return NextResponse.json(
      {
        success: true,
        message: "Sale created successfully using FEFO",
        data: populatedSale,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("FEFO Sale error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to create sale",
      },
      { status: 500 }
    );
  }
}