import { ArrowUpRight, ArrowDownRight, Package, DollarSign, Activity, AlertTriangle, MoreHorizontal } from "lucide-react";

export default function Dashboard() {
  const stats = [
    {
      title: "Total Revenue",
      value: "$45,231.89",
      change: "+20.1%",
      trend: "up",
      icon: DollarSign,
      color: "text-emerald-500",
      bgColor: "bg-emerald-500/10",
    },
    {
      title: "Medicines in Stock",
      value: "2,405",
      change: "+14.5%",
      trend: "up",
      icon: Package,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
    },
    {
      title: "Low Stock Items",
      value: "12",
      change: "-5.2%",
      trend: "down",
      icon: AlertTriangle,
      color: "text-amber-500",
      bgColor: "bg-amber-500/10",
    },
    {
      title: "Active Prescriptions",
      value: "156",
      change: "+8.2%",
      trend: "up",
      icon: Activity,
      color: "text-purple-500",
      bgColor: "bg-purple-500/10",
    },
  ];

  const recentSales = [
    { id: "ORD-001", medicine: "Amoxicillin 500mg", customer: "John Doe", amount: "$15.50", status: "Completed", date: "Just now" },
    { id: "ORD-002", medicine: "Ibuprofen 400mg", customer: "Sarah Smith", amount: "$8.20", status: "Completed", date: "10 mins ago" },
    { id: "ORD-003", medicine: "Lisinopril 10mg", customer: "Michael Brown", amount: "$22.00", status: "Processing", date: "1 hour ago" },
    { id: "ORD-004", medicine: "Metformin 500mg", customer: "Emma Wilson", amount: "$12.40", status: "Completed", date: "2 hours ago" },
    { id: "ORD-005", medicine: "Atorvastatin 20mg", customer: "James Johnson", amount: "$28.90", status: "Completed", date: "3 hours ago" },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">Overview</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Here's what's happening in your pharmacy today.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.title} className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-gray-100 dark:border-zinc-800 shadow-sm transition-all hover:shadow-md">
            <div className="flex items-center justify-between">
              <div className={`p-3 rounded-xl ${stat.bgColor}`}>
                <stat.icon className={`w-5 h-5 ${stat.color}`} />
              </div>
              <div className={`flex items-center text-xs font-semibold ${stat.trend === 'up' ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
                {stat.trend === 'up' ? <ArrowUpRight className="w-3 h-3 mr-1" /> : <ArrowDownRight className="w-3 h-3 mr-1" />}
                {stat.change}
              </div>
            </div>
            <div className="mt-4">
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">{stat.title}</h3>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Chart Area placeholder */}
        <div className="lg:col-span-2 bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-gray-100 dark:border-zinc-800 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Revenue Overview</h2>
            <select className="text-sm bg-gray-50 border border-gray-200 text-gray-700 rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2 dark:bg-zinc-800 dark:border-zinc-700 dark:placeholder-gray-400 dark:text-white">
              <option>This Week</option>
              <option>This Month</option>
              <option>This Year</option>
            </select>
          </div>
          
          <div className="h-72 w-full flex items-end justify-between space-x-2 pt-4">
            {/* Simple CSS Bar Chart Visualization */}
            {[40, 70, 45, 90, 65, 55, 80].map((height, i) => (
              <div key={i} className="w-full bg-blue-50 dark:bg-blue-900/10 rounded-t-lg relative group">
                <div 
                  className="absolute bottom-0 w-full bg-blue-500 rounded-t-lg transition-all duration-1000 ease-out" 
                  style={{ height: `${height}%` }}
                ></div>
                <div className="opacity-0 group-hover:opacity-100 absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs py-1 px-2 rounded transition-opacity">
                  ${height * 120}
                </div>
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-4 text-xs text-gray-500 dark:text-gray-400">
            <span>Mon</span>
            <span>Tue</span>
            <span>Wed</span>
            <span>Thu</span>
            <span>Fri</span>
            <span>Sat</span>
            <span>Sun</span>
          </div>
        </div>

        {/* Recent Sales Table */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-gray-100 dark:border-zinc-800 shadow-sm overflow-hidden flex flex-col">
          <div className="p-6 border-b border-gray-100 dark:border-zinc-800 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Sales</h2>
            <button className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 font-medium">View All</button>
          </div>
          
          <div className="flex-1 overflow-auto">
            <ul className="divide-y divide-gray-100 dark:divide-zinc-800">
              {recentSales.map((sale) => (
                <li key={sale.id} className="p-4 hover:bg-gray-50 dark:hover:bg-zinc-800/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{sale.medicine}</p>
                      <div className="flex items-center mt-1 space-x-2 text-xs text-gray-500 dark:text-gray-400">
                        <span>{sale.customer}</span>
                        <span>&bull;</span>
                        <span>{sale.date}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-gray-900 dark:text-white">{sale.amount}</p>
                      <span className={`inline-flex items-center px-2 py-0.5 mt-1 rounded text-xs font-medium ${
                        sale.status === 'Completed' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400' : 'bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400'
                      }`}>
                        {sale.status}
                      </span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
