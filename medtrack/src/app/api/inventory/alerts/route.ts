import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/db";
import { Batch } from "@/lib/models/Batch";

export async function GET() {
    try {
        await connectToDatabase();

        const today = new Date();

        const thirtyDaysFromNow = new Date();
        thirtyDaysFromNow.setDate(today.getDate() + 30);

        const batches = await Batch.find({
            $or: [
                {
                    expirationDate: {
                        $lt: today,
                    },
                },
                {
                    expirationDate: {
                        $gte: today,
                        $lte: thirtyDaysFromNow,
                    },
                },
                {
                    quantity: {
                        $lte: 10,
                    },
                },
            ],
        })
            .populate("medicineId")
            .sort({ expirationDate: 1 });

        const alerts = batches.map((batch) => {
            const alertsForBatch: string[] = [];

            if (batch.expirationDate < today) {
                alertsForBatch.push("expired");
            } else if (batch.expirationDate <= thirtyDaysFromNow) {
                alertsForBatch.push("expiring_soon");
            }

            if (batch.quantity <= 10) {
                alertsForBatch.push("low_stock");
            }

            return {
                batchId: batch._id,
                medicineId: batch.medicineId?._id,
                medicineName: batch.medicineId?.name,
                batchNumber: batch.batchNumber,
                quantity: batch.quantity,
                expirationDate: batch.expirationDate,
                alerts: alertsForBatch,
            };
        });

        return NextResponse.json(
            {
                success: true,
                count: alerts.length,
                data: alerts,
            },
            { status: 200 }
        );
    } catch (error) {
        console.error("Inventory alerts error:", error);

        return NextResponse.json(
            {
                success: false,
                message: "Failed to fetch inventory alerts",
            },
            { status: 500 }
        );
    }
}