import { NextRequest, NextResponse } from "next/server";

import connectToDatabase from "@/lib/db";
import { Medicine } from "@/lib/models/Medicine";

// GET: Get medicines with filters
export async function GET(request: NextRequest) {
    try {
        await connectToDatabase();

        const { searchParams } = new URL(request.url);

        const search = searchParams.get("search");
        const category = searchParams.get("category");
        const status = searchParams.get("status");

        const filter: Record<string, unknown> = {};

        // Search by medicine name or generic name
        if (search) {
            filter.$or = [
                {
                    name: {
                        $regex: search,
                        $options: "i",
                    },
                },
                {
                    genericName: {
                        $regex: search,
                        $options: "i",
                    },
                },
            ];
        }

        // Filter by category
        if (category) {
            filter.category = category;
        }

        // Filter by status
        if (status) {
            filter.status = status;
        }

        const medicines = await Medicine.find(filter).sort({
            createdAt: -1,
        });

        return NextResponse.json(
            {
                success: true,
                count: medicines.length,
                data: medicines,
            },
            { status: 200 }
        );
    } catch (error) {
        console.error("Medicines GET error:", error);

        return NextResponse.json(
            {
                success: false,
                message: "Failed to fetch medicines",
            },
            { status: 500 }
        );
    }
}

// POST: Create a new medicine
export async function POST(request: NextRequest) {
    try {
        await connectToDatabase();

        const body = await request.json();

        const {
            name,
            genericName,
            description,
            category,
            manufacturer,
            prescriptionRequired,
            status,
        } = body;

        // Validate required fields
        if (!name || !category) {
            return NextResponse.json(
                {
                    success: false,
                    message: "Medicine name and category are required",
                },
                { status: 400 }
            );
        }

        const trimmedName = name.trim();
        const trimmedCategory = category.trim();

        if (!trimmedName || !trimmedCategory) {
            return NextResponse.json(
                {
                    success: false,
                    message: "Medicine name and category cannot be empty",
                },
                { status: 400 }
            );
        }

        // Check duplicate medicine name
        const existingMedicine = await Medicine.findOne({
            name: trimmedName,
        });

        if (existingMedicine) {
            return NextResponse.json(
                {
                    success: false,
                    message: "Medicine with this name already exists",
                },
                { status: 409 }
            );
        }

        // Create medicine
        const medicine = await Medicine.create({
            name: trimmedName,
            genericName: genericName?.trim(),
            description: description?.trim(),
            category: trimmedCategory,
            manufacturer: manufacturer?.trim(),
            prescriptionRequired:
                prescriptionRequired ?? false,
            status: status ?? "active",
        });

        return NextResponse.json(
            {
                success: true,
                message: "Medicine created successfully",
                data: medicine,
            },
            { status: 201 }
        );
    } catch (error) {
        console.error("Medicines POST error:", error);

        return NextResponse.json(
            {
                success: false,
                message: "Failed to create medicine",
            },
            { status: 500 }
        );
    }
}