import { NextResponse } from "next/server";

import connectToDatabase from "@/lib/db";
import { Medicine } from "@/lib/models/Medicine";
import { Batch } from "@/lib/models/Batch";

export async function GET() {
    try {
        await connectToDatabase();

        const now = new Date();

        // Date 30 days from now
        const thirtyDaysFromNow = new Date();
        thirtyDaysFromNow.setDate(
            thirtyDaysFromNow.getDate() + 30
        );

        // Total active medicines
        const totalMedicines = await Medicine.countDocuments({
            status: "active",
        });

        // Total batches
        const totalBatches = await Batch.countDocuments();

        // Get all batches for calculations
        const batches = await Batch.find();

        // Total stock quantity
        const totalStock = batches.reduce(
            (total, batch) => total + batch.quantity,
            0
        );

        // Total inventory value
        const totalInventoryValue = batches.reduce(
            (total, batch) =>
                total + batch.quantity * batch.purchasePrice,
            0
        );

        // Low stock batches
        const lowStockCount = batches.filter(
            (batch) =>
                batch.quantity > 0 && batch.quantity <= 10
        ).length;

        // Expired batches
        const expiredCount = batches.filter(
            (batch) =>
                batch.expirationDate < now &&
                batch.quantity > 0
        ).length;

        // Batches expiring within 30 days
        const expiringSoonCount = batches.filter(
            (batch) =>
                batch.expirationDate >= now &&
                batch.expirationDate <= thirtyDaysFromNow &&
                batch.quantity > 0
        ).length;

        return NextResponse.json(
            {
                success: true,
                data: {
                    totalMedicines,
                    totalBatches,
                    totalStock,
                    totalInventoryValue,
                    lowStockCount,
                    expiredCount,
                    expiringSoonCount,
                },
            },
            { status: 200 }
        );
    } catch (error) {
        console.error("Dashboard GET error:", error);

        return NextResponse.json(
            {
                success: false,
                message: "Failed to fetch dashboard data",
            },
            { status: 500 }
        );
    }
}