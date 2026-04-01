const express = require("express");

const app = express();

app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

app.get("/api/activities", (req, res) => {
  const activities = [
    {
      id: 1,
      name: "Walking",
      duration: 30,
      calories: 150,
    },
    {
      id: 2,
      name: "Running",
      duration: 20,
      calories: 250,
    },
  ];
  res.json(activities);
});

const PORT = 3000;

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`VitalSync API on :${PORT}`);
});
