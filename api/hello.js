export default function handler(req, res) {
  res.status(200).json({ 
    ok: true, 
    message: "Safety Check API is working!",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
}