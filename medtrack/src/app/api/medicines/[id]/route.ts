import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/db";
import { Medicine } from "@/lib/models/Medicine";

// GET: Get one medicine
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        await connectToDatabase();

        const { id } = await params;

        const medicine = await Medicine.findById(id);

        if (!medicine) {
            return NextResponse.json(
                {
                    success: false,
                    message: "Medicine not found",
                },
                { status: 404 }
            );
        }

        return NextResponse.json(
            {
                success: true,
                data: medicine,
            },
            { status: 200 }
        );
    } catch (error) {
        console.error("Medicine GET error:", error);

        return NextResponse.json(
            {
                success: false,
                message: "Failed to fetch medicine",
            },
            { status: 500 }
        );
    }
}

// PUT: Update one medicine
export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        await connectToDatabase();

        const { id } = await params;
        const body = await request.json();

        const medicine = await Medicine.findByIdAndUpdate(
            id,
            body,
            {
                new: true,
                runValidators: true,
            }
        );

        if (!medicine) {
            return NextResponse.json(
                {
                    success: false,
                    message: "Medicine not found",
                },
                { status: 404 }
            );
        }

        return NextResponse.json(
            {
                success: true,
                message: "Medicine updated successfully",
                data: medicine,
            },
            { status: 200 }
        );
    } catch (error) {
        console.error("Medicine PUT error:", error);

        return NextResponse.json(
            {
                success: false,
                message: "Failed to update medicine",
            },
            { status: 500 }
        );
    }
}

// DELETE: Delete one medicine
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        await connectToDatabase();

        const { id } = await params;

        const medicine = await Medicine.findByIdAndDelete(id);

        if (!medicine) {
            return NextResponse.json(
                {
                    success: false,
                    message: "Medicine not found",
                },
                { status: 404 }
            );
        }

        return NextResponse.json(
            {
                success: true,
                message: "Medicine deleted successfully",
            },
            { status: 200 }
        );
    } catch (error) {
        console.error("Medicine DELETE error:", error);

        return NextResponse.json(
            {
                success: false,
                message: "Failed to delete medicine",
            },
            { status: 500 }
        );
    }
}