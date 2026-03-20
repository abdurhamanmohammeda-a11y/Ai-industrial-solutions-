import React, { useEffect, useState } from "react";
import { db } from "./firebase";
import { collection, getDocs } from "firebase/firestore";
import { Line } from "react-chartjs-2";
import AIAlert from "./AIAlert";

const Dashboard = () => {
  const [factories, setFactories] = useState([]);
  const [chartData, setChartData] = useState({});

  useEffect(() => {
    const fetchFactories = async () => {
      const querySnapshot = await getDocs(collection(db, "factories"));
      const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setFactories(data);

      // simulate chart
      setChartData({
        labels: ["Jan", "Feb", "Mar", "Apr"],
        datasets: [
          {
            label: "Machine Utilization",
            data: data.map(f => f.utilization),
            backgroundColor: "rgba(54, 162, 235, 0.5)",
          },
        ],
      });
    };

    fetchFactories();
  }, []);

  return (
    <div>
      <h1>Industrial AI Dashboard</h1>
      {factories.map(f => (
        <div key={f.id}>
          <h2>{f.name}</h2>
          <AIAlert factory={f} />
        </div>
      ))}
      <Line data={chartData} />
    </div>
  );
};

export default Dashboard;
