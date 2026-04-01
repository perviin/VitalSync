const request = require("supertest");
const express = require("express");
const app = express();

app.get("/health", (req, res) =>
  res.json({
    status: "ok",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  }),
);

app.get("/api/activities", (req, res) => {
  const activities = [
    { id: 1, name: "Walking", duration: 30, calories: 150 },
    { id: 2, name: "Running", duration: 20, calories: 250 },
  ];
  res.json(activities);
});

test("GET /health returns 200 with status ok", async () => {
  const res = await request(app).get("/health");
  expect(res.statusCode).toBe(200);
  expect(res.body.status).toBe("ok");
  expect(res.body.uptime).toBeDefined();
  expect(res.body.timestamp).toBeDefined();
});

test("GET /api/activities returns array of activities", async () => {
  const res = await request(app).get("/api/activities");
  expect(res.statusCode).toBe(200);
  expect(Array.isArray(res.body)).toBe(true);
  expect(res.body.length).toBe(2);
  expect(res.body[0]).toHaveProperty("name");
  expect(res.body[0]).toHaveProperty("duration");
});
