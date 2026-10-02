import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/db";
import { Medicine } from "@/lib/models/Medicine";

// GET: Fetch all medicines
export async function GET() {
    try {
        await connectToDatabase();

        const medicines = await Medicine.find().sort({ createdAt: -1 });

        return NextResponse.json(
            {
                success: true,
                data: medicines,
            },
            { status: 200 }
        );
    } catch (error) {
        console.error("Medicine GET error:", error);

        return NextResponse.json(
            {
                success: false,
                message: "Failed to fetch medicines",
            },
            { status: 500 }
        );
    }
}

// POST: Add a new medicine
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

        // Check required fields
        if (!name || !category) {
            return NextResponse.json(
                {
                    success: false,
                    message: "Medicine name and category are required",
                },
                { status: 400 }
            );
        }

        // Check duplicate medicine
        const existingMedicine = await Medicine.findOne({
            name: name.trim(),
        });

        if (existingMedicine) {
            return NextResponse.json(
                {
                    success: false,
                    message: "Medicine already exists",
                },
                { status: 409 }
            );
        }

        // Create medicine
        const medicine = await Medicine.create({
            name: name.trim(),
            genericName,
            description,
            category: category.trim(),
            manufacturer,
            prescriptionRequired,
            status,
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
        console.error("Medicine POST error:", error);

        return NextResponse.json(
            {
                success: false,
                message: "Failed to create medicine",
            },
            { status: 500 }
        );
    }
}