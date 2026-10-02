import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/db";
import { Medicine } from "@/lib/models/Medicine";
import { Batch } from "@/lib/models/Batch";

export async function GET() {
    try {
        await connectToDatabase();

        const totalMedicines = await Medicine.countDocuments({
            status: "active",
        });

        const totalBatches = await Batch.countDocuments();

        const batches = await Batch.find();

        const totalStockQuantity = batches.reduce(
            (total, batch) => total + batch.quantity,
            0
        );

        const totalInventoryValue = batches.reduce(
            (total, batch) => total + batch.quantity * batch.purchasePrice,
            0
        );

        const lowStockCount = batches.filter(
            (batch) => batch.quantity <= 10
        ).length;

        const today = new Date();

        const thirtyDaysFromNow = new Date();
        thirtyDaysFromNow.setDate(today.getDate() + 30);

        const expiringSoonCount = batches.filter(
            (batch) =>
                batch.expirationDate >= today &&
                batch.expirationDate <= thirtyDaysFromNow
        ).length;

        return NextResponse.json(
            {
                success: true,
                data: {
                    totalMedicines,
                    totalBatches,
                    totalStockQuantity,
                    totalInventoryValue,
                    lowStockCount,
                    expiringSoonCount,
                },
            },
            { status: 200 }
        );
    } catch (error) {
        console.error("Dashboard API error:", error);

        return NextResponse.json(
            {
                success: false,
                message: "Failed to fetch dashboard statistics",
            },
            { status: 500 }
        );
    }
}