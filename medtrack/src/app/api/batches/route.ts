import { NextRequest, NextResponse } from "next/server";

import connectToDatabase from "@/lib/db";
import { Batch } from "@/lib/models/Batch";
import { Medicine } from "@/lib/models/Medicine";

// GET: Get batches with filters
export async function GET(request: NextRequest) {
    try {
        await connectToDatabase();

        const { searchParams } = new URL(request.url);

        const search = searchParams.get("search");
        const medicineId = searchParams.get("medicineId");
        const stock = searchParams.get("stock");
        const expiry = searchParams.get("expiry");

        const filter: Record<string, unknown> = {};

        // Search by batch number
        if (search) {
            filter.batchNumber = {
                $regex: search,
                $options: "i",
            };
        }

        // Filter by medicine
        if (medicineId) {
            filter.medicineId = medicineId;
        }

        // Filter by stock
        if (stock === "available") {
            filter.quantity = { $gt: 0 };
        }

        if (stock === "out") {
            filter.quantity = 0;
        }

        // Filter by expiry
        const now = new Date();

        if (expiry === "expired") {
            filter.expirationDate = { $lt: now };
        }

        if (expiry === "valid") {
            filter.expirationDate = { $gt: now };
        }

        if (expiry === "expiring") {
            const thirtyDaysFromNow = new Date();
            thirtyDaysFromNow.setDate(
                thirtyDaysFromNow.getDate() + 30
            );

            filter.expirationDate = {
                $gte: now,
                $lte: thirtyDaysFromNow,
            };
        }

        const batches = await Batch.find(filter)
            .populate("medicineId")
            .sort({ expirationDate: 1 });

        return NextResponse.json(
            {
                success: true,
                count: batches.length,
                data: batches,
            },
            { status: 200 }
        );
    } catch (error) {
        console.error("Batches GET error:", error);

        return NextResponse.json(
            {
                success: false,
                message: "Failed to fetch batches",
            },
            { status: 500 }
        );
    }
}

// POST: Create a new batch
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

        // Validate required fields
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
                    message:
                        "Medicine ID, batch number, quantity, purchase price, selling price and expiration date are required",
                },
                { status: 400 }
            );
        }

        // Validate quantity
        if (quantity < 0) {
            return NextResponse.json(
                {
                    success: false,
                    message: "Quantity cannot be negative",
                },
                { status: 400 }
            );
        }

        // Validate prices
        if (purchasePrice < 0 || sellingPrice < 0) {
            return NextResponse.json(
                {
                    success: false,
                    message: "Prices cannot be negative",
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

        // Check duplicate batch number for this medicine
        const existingBatch = await Batch.findOne({
            medicineId,
            batchNumber: batchNumber.trim(),
        });

        if (existingBatch) {
            return NextResponse.json(
                {
                    success: false,
                    message:
                        "This batch number already exists for this medicine",
                },
                { status: 409 }
            );
        }

        // Validate expiration date
        const expiryDate = new Date(expirationDate);

        if (isNaN(expiryDate.getTime())) {
            return NextResponse.json(
                {
                    success: false,
                    message: "Invalid expiration date",
                },
                { status: 400 }
            );
        }

        if (expiryDate <= new Date()) {
            return NextResponse.json(
                {
                    success: false,
                    message: "Expiration date must be in the future",
                },
                { status: 400 }
            );
        }

        // Create batch
        const batch = await Batch.create({
            medicineId,
            batchNumber: batchNumber.trim(),
            quantity,
            purchasePrice,
            sellingPrice,
            expirationDate: expiryDate,
            receivedDate: receivedDate
                ? new Date(receivedDate)
                : undefined,
        });

        // Return populated batch
        const populatedBatch = await Batch.findById(
            batch._id
        ).populate("medicineId");

        return NextResponse.json(
            {
                success: true,
                message: "Batch created successfully",
                data: populatedBatch,
            },
            { status: 201 }
        );
    } catch (error) {
        console.error("Batches POST error:", error);

        return NextResponse.json(
            {
                success: false,
                message: "Failed to create batch",
            },
            { status: 500 }
        );
    }
}