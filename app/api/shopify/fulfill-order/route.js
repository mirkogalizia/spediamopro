export default async function handler(req, res) {
  console.log("INIZIO FULFILL-ORDER - ARRIVATA RICHIESTA", req.method, req.body);

  if (req.method !== "POST") 
    return res.status(405).json({ error: "Only POST allowed" });

  // *** DEBUG: restituisci direttamente l'echo del body ***
  return res.status(200).json({ success: true, echo: req.body });
}