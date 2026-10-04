import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/db";
import { Medicine } from "@/lib/models/Medicine";
import { Batch } from "@/lib/models/Batch";
import { Sale } from "@/lib/models/Sale";

// GET: Get sales with filters
export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();

    const { searchParams } = new URL(request.url);

    const medicineId = searchParams.get("medicineId");
    const batchId = searchParams.get("batchId");
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    const filter: Record<string, unknown> = {};

    // Filter by medicine
    if (medicineId) {
      filter.medicineId = medicineId;
    }

    // Filter by batch
    if (batchId) {
      filter.batchId = batchId;
    }

    // Filter by date range
    if (from || to) {
      const dateFilter: Record<string, Date> = {};

      if (from) {
        dateFilter.$gte = new Date(`${from}T00:00:00`);
      }

      if (to) {
        dateFilter.$lte = new Date(`${to}T23:59:59.999`);
      }

      filter.date = dateFilter;
    }

    const sales = await Sale.find(filter)
      .populate("medicineId")
      .populate("batchId")
      .sort({ date: -1 });

    // Calculate total revenue
    const totalRevenue = sales.reduce(
      (total, sale) => total + sale.totalPrice,
      0
    );

    // Calculate total quantity sold
    const totalQuantitySold = sales.reduce(
      (total, sale) => total + sale.quantity,
      0
    );

    return NextResponse.json(
      {
        success: true,
        count: sales.length,
        summary: {
          totalRevenue,
          totalQuantitySold,
        },
        data: sales,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Sales GET error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch sales",
      },
      { status: 500 }
    );
  }
}

// POST: Create a sale using FEFO
export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();

    const body = await request.json();

    const { medicineId, quantity } = body;

    if (!medicineId || quantity === undefined) {
      return NextResponse.json(
        {
          success: false,
          message: "Medicine ID and quantity are required",
        },
        { status: 400 }
      );
    }

    if (quantity <= 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Quantity must be greater than 0",
        },
        { status: 400 }
      );
    }

    // Check medicine exists
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

    // Find valid batches using FEFO
    const batches = await Batch.find({
      medicineId,
      quantity: { $gt: 0 },
      expirationDate: { $gt: new Date() },
    }).sort({
      expirationDate: 1,
    });

    const totalStock = batches.reduce(
      (total, batch) => total + batch.quantity,
      0
    );

    if (totalStock < quantity) {
      return NextResponse.json(
        {
          success: false,
          message: `Insufficient stock. Available stock: ${totalStock}`,
        },
        { status: 400 }
      );
    }

    let remainingQuantity = quantity;

    const createdSales = [];

    // FEFO: consume earliest-expiring batches first
    for (const batch of batches) {
      if (remainingQuantity <= 0) {
        break;
      }

      const quantityToSell = Math.min(
        batch.quantity,
        remainingQuantity
      );

      batch.quantity -= quantityToSell;

      await batch.save();

      const sale = await Sale.create({
        medicineId,
        batchId: batch._id,
        quantity: quantityToSell,
        unitPrice: batch.sellingPrice,
        totalPrice: quantityToSell * batch.sellingPrice,
      });

      createdSales.push(sale);

      remainingQuantity -= quantityToSell;
    }

    const populatedSales = await Sale.find({
      _id: { $in: createdSales.map((sale) => sale._id) },
    })
      .populate("medicineId")
      .populate("batchId");

    return NextResponse.json(
      {
        success: true,
        message: "Sale completed successfully using FEFO",
        data: populatedSales,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Sales POST error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to create sale",
      },
      { status: 500 }
    );
  }
}