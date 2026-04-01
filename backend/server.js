const express = require("express");
const app = express();
app.get("/health", (req, res) => {
  res.json({ status: "ok", uptime: process.uptime() });
});
app.get("/api/activities", (req, res) => {
  const activities = [
    { id: 1, name: "Walking", duration: 30, calories: 150 },
    { id: 2, name: "Running", duration: 20, calories: 250 },
  ];
  res.json(activities);
});
app.listen(3000, () => console.log("VitalSync API on :3000"));
