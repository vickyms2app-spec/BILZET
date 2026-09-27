import { useEffect, useState } from "react";
import { reportsApi } from "../api";
import { Card, Loading, Button } from "../components/ui";
export default function Reports() {
  const [sales, setSales] = useState(),
    [profit, setProfit] = useState();
 /*  useEffect(() => {
    const p = {
      from: new Date(
        new Date().setDate(new Date().getDate() - 30),
      ).toISOString(),
      to: new Date().toISOString(),
    };
    reportsApi
      .sales(p)
      .then(setSales)
      .catch(() => {});
    reportsApi
      .profit(p)
      .then(setProfit)
      .catch(() => {});
  }, []); */
  useEffect(() => {
  const loadReports = async () => {
    const p = {
      from: new Date(
        new Date().setDate(new Date().getDate() - 30),
      ).toISOString(),
      to: new Date().toISOString(),
    };

    try {
      const [sales, profit] = await Promise.all([
        reportsApi.sales(p),
        reportsApi.profit(p),
      ]);

      setSales(sales);
      setProfit(profit);
    } catch (e) {
      console.error("Failed to load reports:", e);
    }
  };

  loadReports();
}, []);
  return (
    <div className="space-y-5">
      <header>
        <p className="text-xs font-semibold uppercase text-brand">Analytics</p>
        <h1 className="text-2xl font-bold">Reports</h1>
        <p className="text-sm text-slate-500">
          Backend-generated reports for the last 30 days.
        </p>
      </header>
      <div className="grid gap-5 md:grid-cols-2">
        <Card className="p-5">
          <h2 className="font-semibold">Sales report</h2>
          {sales ? (
            <pre className="mt-4 max-h-96 overflow-auto rounded-lg bg-slate-950 p-4 text-xs text-slate-200">
              {JSON.stringify(sales, null, 2)}
            </pre>
          ) : (
            <Loading />
          )}
        </Card>
        <Card className="p-5">
          <h2 className="font-semibold">Profit report</h2>
          {profit ? (
            <pre className="mt-4 max-h-96 overflow-auto rounded-lg bg-slate-950 p-4 text-xs text-slate-200">
              {JSON.stringify(profit, null, 2)}
            </pre>
          ) : (
            <Loading />
          )}
        </Card>
      </div>
    </div>
  );
}
