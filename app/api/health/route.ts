export async function GET() {
  return Response.json({
    status: "good",
    app: "notedwork",
    timestamp: new Date().toISOString(),
  });
}
