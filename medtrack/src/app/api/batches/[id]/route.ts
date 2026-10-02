import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/db";
import { Batch } from "@/lib/models/Batch";
import { Medicine } from "@/lib/models/Medicine";

// GET: Get one batch
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        await connectToDatabase();

        const { id } = await params;

        const batch = await Batch.findById(id).populate("medicineId");

        if (!batch) {
            return NextResponse.json(
                {
                    success: false,
                    message: "Batch not found",
                },
                { status: 404 }
            );
        }

        return NextResponse.json(
            {
                success: true,
                data: batch,
            },
            { status: 200 }
        );
    } catch (error) {
        console.error("Batch GET error:", error);

        return NextResponse.json(
            {
                success: false,
                message: "Failed to fetch batch",
            },
            { status: 500 }
        );
    }
}

// PUT: Update one batch
export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        await connectToDatabase();

        const { id } = await params;
        const body = await request.json();

        const batch = await Batch.findById(id);

        if (!batch) {
            return NextResponse.json(
                {
                    success: false,
                    message: "Batch not found",
                },
                { status: 404 }
            );
        }

        // If medicineId is being changed, verify the medicine exists
        if (body.medicineId) {
            const medicine = await Medicine.findById(body.medicineId);

            if (!medicine) {
                return NextResponse.json(
                    {
                        success: false,
                        message: "Medicine not found",
                    },
                    { status: 404 }
                );
            }
        }

        // Validate quantity
        if (body.quantity !== undefined && body.quantity < 0) {
            return NextResponse.json(
                {
                    success: false,
                    message: "Quantity cannot be negative",
                },
                { status: 400 }
            );
        }

        // Validate prices
        if (
            (body.purchasePrice !== undefined && body.purchasePrice < 0) ||
            (body.sellingPrice !== undefined && body.sellingPrice < 0)
        ) {
            return NextResponse.json(
                {
                    success: false,
                    message: "Prices cannot be negative",
                },
                { status: 400 }
            );
        }

        // Validate expiry date
        if (body.expirationDate) {
            if (new Date(body.expirationDate) <= new Date()) {
                return NextResponse.json(
                    {
                        success: false,
                        message: "Expiration date must be in the future",
                    },
                    { status: 400 }
                );
            }
        }

        const updatedBatch = await Batch.findByIdAndUpdate(
            id,
            body,
            {
                new: true,
                runValidators: true,
            }
        ).populate("medicineId");

        return NextResponse.json(
            {
                success: true,
                message: "Batch updated successfully",
                data: updatedBatch,
            },
            { status: 200 }
        );
    } catch (error) {
        console.error("Batch PUT error:", error);

        return NextResponse.json(
            {
                success: false,
                message: "Failed to update batch",
            },
            { status: 500 }
        );
    }
}

// DELETE: Delete one batch
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        await connectToDatabase();

        const { id } = await params;

        const batch = await Batch.findById(id);

        if (!batch) {
            return NextResponse.json(
                {
                    success: false,
                    message: "Batch not found",
                },
                { status: 404 }
            );
        }

        // Don't delete a batch that still has stock
        if (batch.quantity > 0) {
            return NextResponse.json(
                {
                    success: false,
                    message: "Cannot delete a batch that still has stock",
                },
                { status: 400 }
            );
        }

        await Batch.findByIdAndDelete(id);

        return NextResponse.json(
            {
                success: true,
                message: "Batch deleted successfully",
            },
            { status: 200 }
        );
    } catch (error) {
        console.error("Batch DELETE error:", error);

        return NextResponse.json(
            {
                success: false,
                message: "Failed to delete batch",
            },
            { status: 500 }
        );
    }
}