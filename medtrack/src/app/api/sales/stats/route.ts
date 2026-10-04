import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/db";
import { Sale } from "@/lib/models/Sale";

export async function GET() {
  try {
    await connectToDatabase();

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const firstDayOfWeek = new Date(today);
    firstDayOfWeek.setDate(today.getDate() - today.getDay());

    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    // Get all sales for stats calculation
    const allSales = await Sale.find().lean();
    
    // Revenue calculations
    const totalRevenue = allSales.reduce((sum, sale) => sum + sale.totalPrice, 0);
    
    const todaySales = allSales.filter(s => new Date(s.date) >= today);
    const todayRevenue = todaySales.reduce((sum, sale) => sum + sale.totalPrice, 0);

    const weekSales = allSales.filter(s => new Date(s.date) >= firstDayOfWeek);
    const weekRevenue = weekSales.reduce((sum, sale) => sum + sale.totalPrice, 0);

    const monthSales = allSales.filter(s => new Date(s.date) >= firstDayOfMonth);
    const monthRevenue = monthSales.reduce((sum, sale) => sum + sale.totalPrice, 0);

    // Recent sales
    const recentSales = await Sale.find()
      .populate("medicineId")
      .sort({ date: -1 })
      .limit(5)
      .lean();

    return NextResponse.json(
      {
        success: true,
        data: {
          totalRevenue,
          todayRevenue,
          weekRevenue,
          monthRevenue,
          salesCount: allSales.length,
          recentSales,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Sales stats GET error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch sales stats",
      },
      { status: 500 }
    );
  }
}
